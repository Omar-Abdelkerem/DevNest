import prisma from "../config/prisma.client.js";
import statusCodes from "http-status-codes";
import { notFoundError, unauthorizedError } from "../errors/index.js";
import getOrSetCache from "../utils/cache.util.js";
import {
  addCommentSchema,
  updateCommentSchema,
  commentIdSchema,
} from "../schemas/comments.schema.js";
import { projectIdSchema } from "../schemas/project.schema.js";

/** Must mirror project.controller.js so we read from the same cache key. */
const projectCacheKey = (id) => `project:id:${id}:v1`;

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

  // Try to read the project from the shared cache first (populated by getProjectById).
  // Falls back to a DB query if the cache is cold — avoids a second RTT on the hot path.
  const project = await getOrSetCache(
    projectCacheKey(id),
    3600,
    async () => {
      const row = await prisma.project.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, username: true, avatarUrl: true, isPublic: true } },
          projectLanguages: { include: { language: true } },
          _count: { select: { stars: true } },
        },
      });
      return row;
    },
  );

  if (!project) {
    throw new notFoundError(`Project with id ${id} not found`);
  }

  const requesterId = req.user?.userId || req.user?.id;
  const isOwner = project.userId === requesterId;
  // Cached project stores isPublic on `owner` (serialized) or directly on `user`.
  const ownerIsPublic = project.owner?.isPublic ?? project.user?.isPublic ?? false;
  const isVisible = project.isPublic && ownerIsPublic;

  if (!isVisible && !isOwner) {
    throw new unauthorizedError("This project is private.");
  }

  const comments = await prisma.comment.findMany({
    where: { projectId: id },
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  res.status(statusCodes.OK).json(comments);
};
