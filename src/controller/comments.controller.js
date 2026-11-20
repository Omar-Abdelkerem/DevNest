import statusCodes from "http-status-codes";
import prisma from "../config/prisma.client.js";
import { notFoundError, unauthorizedError } from "../errors/index.js";
import getOrSetCache, { CACHE_KEYS } from "../utils/cache.util.js";
import {
  addCommentSchema,
  updateCommentSchema,
  commentIdSchema,
} from "../schemas/comments.schema.js";
import { projectIdSchema } from "../schemas/project.schema.js";
import { projectInclude, serializeProject } from "./project.controller.js";
import { setCacheHeaders } from "../middleware/cache-headers.middleware.js";

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
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
    },
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

  const requesterId = req.user?.userId || req.user?.id;
  const isOwner = comment.project.userId === requesterId;
  const isVisible = comment.project.isPublic && comment.project.user.isPublic;

  if (!isVisible && !isOwner) {
    throw new unauthorizedError("This project is private.");
  }

  setCacheHeaders(res, {
    isPublic: isVisible,
    isAuthenticated: Boolean(requesterId),
    maxAge: 30,
  });
  res.status(statusCodes.OK).json(comment);
};

export const getAllCommentsByProjectId = async (req, res) => {
  const { id } = projectIdSchema.parse(req.params);

  // Uses the exact same shared v2 cache key as project.controller.js
  const project = await getOrSetCache(
    CACHE_KEYS.projectById(id),
    3600,
    async () => {
      const row = await prisma.project.findUnique({
        where: { id },
        include: projectInclude,
      });
      return row ? serializeProject(row) : null;
    },
  );

  if (!project) {
    throw new notFoundError(`Project with id ${id} not found`);
  }

  const requesterId = req.user?.userId || req.user?.id;
  const isOwner = project.userId === requesterId;
  const ownerIsPublic =
    project.owner?.isPublic ?? project.user?.isPublic ?? false;
  const isVisible = Boolean(project.isPublic && ownerIsPublic);

  if (!isVisible && !isOwner) {
    throw new unauthorizedError("This project is private.");
  }

  const rawLimit = parseInt(req.query?.limit, 10);
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 50;

  const comments = await prisma.comment.findMany({
    where: { projectId: id },
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  setCacheHeaders(res, {
    isPublic: isVisible,
    isAuthenticated: Boolean(requesterId),
    maxAge: 30,
  });
  res.status(statusCodes.OK).json(comments);
};
