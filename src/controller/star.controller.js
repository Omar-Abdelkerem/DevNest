import statusCodes from "http-status-codes";
import prisma from "../config/prisma.client.js";
import { notFoundError } from "../errors/index.js";
import { projectIdSchema } from "../schemas/project.schema.js";
import invalidateOwnerPublicCache from "../utils/invalidateOwnerPublicCache.js";
import { CACHE_KEYS, deleteCache } from "../utils/cache.util.js";

export const addStar = async (req, res) => {
  const { id } = projectIdSchema.parse(req.params);
  const userId = req.user.userId || req.user.id;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { user: { select: { username: true, isPublic: true } } },
  });

  if (!project) {
    throw new notFoundError(`Project with id ${id} not found`);
  }

  const isOwner = project.userId === userId;
  const isVisible = project.isPublic && project.user?.isPublic;

  if (!isOwner && !isVisible) {
    throw new notFoundError(`Project with id ${id} not found`);
  }

  const existingStar = await prisma.star.findUnique({
    where: { userId_projectId: { userId, projectId: id } },
  });

  if (existingStar) {
    return res
      .status(statusCodes.CONFLICT)
      .json({ message: "You have already starred this project." });
  }

  const star = await prisma.star.create({ data: { userId, projectId: id } });
  await Promise.all([
    invalidateOwnerPublicCache("projects", project.user?.username),
    deleteCache(CACHE_KEYS.projectById(id)),
  ]);
  res.status(statusCodes.CREATED).json(star);
};

export const removeStar = async (req, res) => {
  const { id } = projectIdSchema.parse(req.params);
  const userId = req.user.userId || req.user.id;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { user: { select: { username: true, isPublic: true } } },
  });

  if (!project) {
    throw new notFoundError(`Project with id ${id} not found`);
  }

  const existingStar = await prisma.star.findUnique({
    where: { userId_projectId: { userId, projectId: id } },
  });

  if (!existingStar) {
    return res
      .status(statusCodes.NOT_FOUND)
      .json({ message: "You have not starred this project." });
  }

  await prisma.star.delete({
    where: { userId_projectId: { userId, projectId: id } },
  });

  await Promise.all([
    invalidateOwnerPublicCache("projects", project.user?.username),
    deleteCache(CACHE_KEYS.projectById(id)),
  ]);
  res.status(statusCodes.NO_CONTENT).send();
};
