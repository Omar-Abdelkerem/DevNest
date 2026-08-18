import prisma from "../config/prisma.client.js";
import client from "../config/redis.client.js";
import statusCodes from "http-status-codes";
import invalidateOwnerPublicCache from "../utils/invalidateOwnerPublicCache.js";
import getOrSetCache from "../utils/cache.util.js";
import { notFoundError, unauthorizedError } from "../errors/index.js";
import {
  addProjectSchema,
  updateProjectSchema,
  projectIdSchema,
} from "../schemas/project.schema.js";

export const addProject = async (req, res) => {
  const validatedData = addProjectSchema.parse(req.body);
  const project = await prisma.project.create({
    data: { ...validatedData, userId: req.user.userId },
  });
  const owner = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { username: true },
  });
  await invalidateOwnerPublicCache("projects", owner.username);
  res.status(statusCodes.CREATED).json(project);
};

export const updateProjectById = async (req, res) => {
  const validatedData = updateProjectSchema.parse(req.body);
  const project = await prisma.project.update({
    where: { id: req.resource.id },
    data: validatedData,
  });
  const owner = await prisma.user.findUnique({
    where: { id: req.resource.userId },
    select: { username: true },
  });
  await invalidateOwnerPublicCache("projects", owner.username);
  res.status(statusCodes.OK).json(project);
};

export const deleteProjectById = async (req, res) => {
  await prisma.project.delete({
    where: { id: req.resource.id },
  });
  const owner = await prisma.user.findUnique({
    where: { id: req.resource.userId },
    select: { username: true },
  });
  await invalidateOwnerPublicCache("projects", owner.username);
  res.status(statusCodes.NO_CONTENT).send();
};

export const getProjectById = async (req, res) => {
  const { id } = projectIdSchema.parse(req.params);

  const project = await prisma.project.findUnique({
    where: { id: id },
    include: { user: { select: { isPublic: true } } },
  });

  if (!project) {
    throw new notFoundError(`Project with id ${id} not found`);
  }
  const isOwner = project.userId === req.user.userId;
  const isVisible = project.isPublic && project.user.isPublic;

  if (!isVisible && !isOwner) {
    throw new unauthorizedError("This project is private.");
  }

  res.status(statusCodes.OK).json(project);
};

export const getAllProjectsByUsername = async (req, res) => {
  const { username } = req.params;
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    throw new notFoundError(`User with username ${username} not found`);
  }
  const isOwner = user.id === req.user.userId;
  let type;
  if (!user.isPublic && !isOwner) {
    throw new unauthorizedError("This profile is private.");
  } else if (!user.isPublic && isOwner) {
    type = "owner";
  } else if (user.isPublic && !isOwner) {
    type = "public";
  } else {
    type = "owner";
  }
  const projects = await getOrSetCache(
    `projects:username:${username}:${type}`,
    3600,
    async () => {
      const where = { userId: user.id };
      if (!isOwner) {
        where.isPublic = true;
      }
      return await prisma.project.findMany({ where });
    },
  );

  res.status(statusCodes.OK).json(projects);
};
