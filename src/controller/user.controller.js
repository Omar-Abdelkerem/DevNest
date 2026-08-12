import prisma from "../config/prisma.client.js";
import statusCodes from "http-status-codes";
import { hashPassword } from "../utils/password-hashing.util.js";
import { notFoundError, unauthorizedError } from "../errors/index.js";
import { updateUserSchema, userIdSchema } from "../schemas/user.schema.js";

export const getUserById = async (req, res) => {
  const { id } = userIdSchema.parse(req.params);
  const user = await prisma.user.findUnique({
    where: {
      id: id,
    },
    select: {
      id: true,
      username: true,
      bio: true,
      avatarUrl: true,
      links: true,
      isPublic: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new notFoundError(`User with id ${id} not found`);
  }
  if (!user.isPublic && user.id !== req.user.userId) {
    throw new unauthorizedError("This profile is private.");
  }

  res.status(statusCodes.OK).json({ user });
};

export const getCurrentUser = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: {
      id: req.user.userId,
    },
    select: {
      id: true,
      username: true,
      bio: true,
      avatarUrl: true,
      links: true,
      isPublic: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new notFoundError(`User with id ${req.user.userId} not found`);
  }

  res.status(statusCodes.OK).json({ user });
};

export const updateCurrentUser = async (req, res) => {
  const validatedData = updateUserSchema.parse(req.body);
  const { password, ...otherData } = validatedData;
  if (password) {
    otherData.passwordHash = await hashPassword(password);
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user.userId },
    data: otherData,
    select: {
      id: true,
      username: true,
      email: true,
      bio: true,
      avatarUrl: true,
      links: true,
      isPublic: true,
      createdAt: true,
    },
  });
  res.status(statusCodes.OK).json({ user: updatedUser });
};
