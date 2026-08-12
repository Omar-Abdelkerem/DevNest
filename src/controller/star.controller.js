import prisma from "../config/prisma.client.js";
import statusCodes from "http-status-codes";
import { notFoundError, badRequestError } from "../errors/index.js";
import { projectIdSchema } from "../schemas/project.schema.js";

export const addStar = async (req, res) => {
  const { id } = projectIdSchema.parse(req.params);
  const userId = req.user.userId;

  const project = await prisma.project.findUnique({
    where: { id: id, isPublic: true, user: { isPublic: true } },
  });

  if (!project) {
    throw new notFoundError(`Project with id ${id} not found`);
  }

  if (project.userId === userId) {
    throw new badRequestError("You cannot star your own project.");
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
  const userId = req.user.userId;

  const project = await prisma.project.findUnique({
    where: { id, isPublic: true, user: { isPublic: true } },
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
