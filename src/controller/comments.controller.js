import prisma from "../config/prisma.client.js";
import statusCodes from "http-status-codes";
import { notFoundError, unauthorizedError } from "../errors/index.js";
import {
  addCommentSchema,
  updateCommentSchema,
  commentIdSchema,
} from "../schemas/comments.schema.js";
import { projectIdSchema } from "../schemas/project.schema.js";

export const addComment = async (req, res) => {
  const validatedData = addCommentSchema.parse(req.body);

  const project = await prisma.project.findUnique({
    where: { id: validatedData.projectId },
    include: { user: { select: { isPublic: true } } },
  });

  if (!project) {
    throw new notFoundError(
      `Project with id ${validatedData.projectId} not found`,
    );
  }

  const isOwner = project.userId === req.user.userId;
  const isVisible = project.isPublic && project.user.isPublic;

  if (!isVisible && !isOwner) {
    throw new unauthorizedError("This project is private.");
  }

  const comment = await prisma.comment.create({
    data: { ...validatedData, userId: req.user.userId },
  });
  res.status(statusCodes.CREATED).json(comment);
};

export const updateCommentById = async (req, res) => {
  const validatedData = updateCommentSchema.parse(req.body);
  const comment = await prisma.comment.update({
    where: { id: req.resource.id },
    data: validatedData,
  });
  res.status(statusCodes.OK).json(comment);
};

export const deleteCommentById = async (req, res) => {
  await prisma.comment.delete({
    where: { id: req.resource.id },
  });
  res.status(statusCodes.NO_CONTENT).send();
};
export const getCommentById = async (req, res) => {
  const { id } = commentIdSchema.parse(req.params);

  const comment = await prisma.comment.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          isPublic: true,
          userId: true,
          user: { select: { isPublic: true } },
        },
      },
    },
  });

  if (!comment) {
    throw new notFoundError(`Comment with id ${id} not found`);
  }

  const isOwner = comment.project.userId === req.user.userId;
  const isVisible = comment.project.isPublic && comment.project.user.isPublic;

  if (!isVisible && !isOwner) {
    throw new unauthorizedError("This project is private.");
  }

  res.status(statusCodes.OK).json(comment);
};
export const getAllCommentsByProjectId = async (req, res) => {
  const { id } = projectIdSchema.parse(req.params);

  const project = await prisma.project.findUnique({
    where: { id },
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

  const comments = await prisma.comment.findMany({ where: { projectId: id } });
  res.status(statusCodes.OK).json(comments);
};
