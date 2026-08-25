import prisma from "../config/prisma.client.js";
import statusCodes from "http-status-codes";
import { hashPassword } from "../utils/password-hashing.util.js";
import {
  notFoundError,
  badRequestError,
  unauthorizedError,
} from "../errors/index.js";
import { updateUserSchema, userIdSchema } from "../schemas/user.schema.js";

export const getUserById = async (req, res) => {
  const { id } = userIdSchema.parse(req.params);
  const user = await prisma.user.findUnique({
    where: { id: id },
    select: {
      id: true,
      username: true,
      bio: true,
      about: true,
      avatarUrl: true,
      links: true,
      isPublic: true,
      createdAt: true,
      _count: { select: { followers: true, following: true } },
    },
  });

  if (!user) {
    throw new notFoundError(`User with id ${id} not found`);
  }
  if (!user.isPublic && user.id !== req.user?.userId) {
    throw new unauthorizedError("This profile is private.");
  }

  res.status(statusCodes.OK).json({ user });
};

// NEW: Fetch by username for public profiles
export const getUserByUsername = async (req, res) => {
  const { username } = req.params; // No UUID schema validation here!

  const user = await prisma.user.findUnique({
    where: { username: username },
    select: {
      id: true,
      username: true,
      bio: true,
      about: true,
      avatarUrl: true,
      links: true,
      isPublic: true,
      createdAt: true,
      _count: { select: { followers: true, following: true } },
    },
  });

  if (!user) {
    throw new notFoundError(`User @${username} not found`);
  }

  const requesterId = req.user?.userId || req.user?.id;
  if (!user.isPublic && user.id !== requesterId) {
    throw new unauthorizedError("This profile is private.");
  }

  res.status(statusCodes.OK).json({ user });
};

export const getCurrentUser = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      username: true,
      bio: true,
      about: true,
      avatarUrl: true,
      links: true,
      isPublic: true,
      createdAt: true,
      _count: { select: { followers: true, following: true } },
    },
  });

  if (!user) {
    throw new notFoundError(`User with id ${req.user.userId} not found`);
  }

  res.status(statusCodes.OK).json({ user });
};

export const updateCurrentUser = async (req, res) => {
  const { skills } = req.body;

  const validatedData = updateUserSchema.parse(req.body);
  const { password, ...otherData } = validatedData;

  if (password) {
    otherData.passwordHash = await hashPassword(password);
  }

  // Map the dynamic name and level straight into Prisma
  if (skills && Array.isArray(skills)) {
    otherData.skills = {
      deleteMany: {},
      create: skills.map((skill) => ({
        name: skill.name,
        level: skill.level,
      })),
    };
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user.userId },
    data: otherData,
    select: {
      id: true,
      username: true,
      email: true,
      bio: true,
      about: true,
      avatarUrl: true,
      links: true,
      isPublic: true,
      createdAt: true,
    },
  });

  res.status(statusCodes.OK).json({ user: updatedUser });
};

export const updateAvatar = async (req, res) => {
  if (!req.file) {
    throw new badRequestError("No image file was uploaded.");
  }

  const avatarUrl = req.file.path;

  const updatedUser = await prisma.user.update({
    where: { id: req.user.userId },
    data: { avatarUrl },
    select: {
      id: true,
      username: true,
      email: true,
      bio: true,
      about: true,
      avatarUrl: true,
      isPublic: true,
      createdAt: true,
    },
  });

  res.status(statusCodes.OK).json({ user: updatedUser });
};
