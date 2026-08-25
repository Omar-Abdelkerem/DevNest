import prisma from "../config/prisma.client.js";
import statusCodes from "http-status-codes";
import { notFoundError } from "../errors/index.js";
import { projectIdSchema } from "../schemas/project.schema.js";

export const addStar = async (req, res) => {
  const { id } = projectIdSchema.parse(req.params);
  const userId = req.user.userId || req.user.id;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!project) {
    throw new notFoundError(`Project with id ${id} not found`);
  }

  // Ensure user has permission to see it (owner or public)
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
  res.status(statusCodes.CREATED).json(star);
};

export const removeStar = async (req, res) => {
  const { id } = projectIdSchema.parse(req.params);
  const userId = req.user.userId || req.user.id;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { user: true },
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

  res.status(statusCodes.NO_CONTENT).send();
};
