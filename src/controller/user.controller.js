import statusCodes from "http-status-codes";
import prisma from "../config/prisma.client.js";
import { hashPassword } from "../utils/password-hashing.util.js";
import {
  notFoundError,
  badRequestError,
  unauthorizedError,
} from "../errors/index.js";
import { updateUserSchema, userIdSchema } from "../schemas/user.schema.js";
import { invalidateAllUserSessions } from "../utils/session.util.js";
import invalidateOwnerPublicCache from "../utils/invalidateOwnerPublicCache.js";
import { setCacheHeaders } from "../middleware/cache-headers.middleware.js";

const publicUserSelect = {
  id: true,
  username: true,
  headline: true,
  bio: true,
  about: true,
  location: true,
  age: true,
  role: true,
  company: true,
  education: true,
  yearsOfExperience: true,
  workPreferences: true,
  phone: true,
  whatsapp: true,
  contactEmail: true,
  resumeUrl: true,
  ctaMessage: true,
  availableForWork: true,
  avatarUrl: true,
  links: true,
  isPublic: true,
  createdAt: true,
  _count: { select: { followers: true, following: true } },
};

const privateUserSelect = {
  ...publicUserSelect,
  email: true,
};

export const getUserById = async (req, res) => {
  const { id } = userIdSchema.parse(req.params);
  const user = await prisma.user.findUnique({
    where: { id },
    select: publicUserSelect,
  });

  if (!user) {
    throw new notFoundError(`User with id ${id} not found`);
  }
  if (!user.isPublic && user.id !== req.user?.userId) {
    throw new unauthorizedError("This profile is private.");
  }

  setCacheHeaders(res, {
    isPublic: user.isPublic,
    isAuthenticated: Boolean(req.user),
    maxAge: 60,
  });
  res.status(statusCodes.OK).json({ user });
};

export const getUserByUsername = async (req, res) => {
  const { username } = req.params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: publicUserSelect,
  });

  if (!user) {
    throw new notFoundError(`User @${username} not found`);
  }

  const requesterId = req.user?.userId || req.user?.id;
  if (!user.isPublic && user.id !== requesterId) {
    throw new unauthorizedError("This profile is private.");
  }

  setCacheHeaders(res, {
    isPublic: user.isPublic,
    isAuthenticated: Boolean(requesterId),
  });
  res.status(statusCodes.OK).json({ user });
};

export const getCurrentUser = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: privateUserSelect,
  });

  if (!user) {
    throw new notFoundError(`User with id ${req.user.userId} not found`);
  }

  setCacheHeaders(res, { isPublic: false, isAuthenticated: true });
  res.status(statusCodes.OK).json({ user });
};

export const updateCurrentUser = async (req, res) => {
  const validatedData = updateUserSchema.parse(req.body);
  const { password, skills, ...otherData } = validatedData;

  const existing = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { username: true },
  });

  if (password) {
    otherData.passwordHash = await hashPassword(password);
  }

  if (skills !== undefined) {
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
    select: privateUserSelect,
  });

  // Security: changing password invalidates all other active sessions for this account
  if (password) {
    await invalidateAllUserSessions(req.user.userId, req.cookies?.sessionId);
  }

  // Invalidate cached project lists (username, avatar, or visibility may have changed)
  await invalidateOwnerPublicCache("projects", existing?.username);
  if (updatedUser.username && updatedUser.username !== existing?.username) {
    await invalidateOwnerPublicCache("projects", updatedUser.username);
  }

  setCacheHeaders(res, { isPublic: false, isAuthenticated: true });
  res.status(statusCodes.OK).json({ user: updatedUser });
};

export const updateAvatar = async (req, res) => {
  if (!req.file?.path) {
    throw new badRequestError("No image file was uploaded.");
  }

  const avatarUrl = req.file.path;

  const updatedUser = await prisma.user.update({
    where: { id: req.user.userId },
    data: { avatarUrl },
    select: privateUserSelect,
  });

  await invalidateOwnerPublicCache("projects", updatedUser.username);
  setCacheHeaders(res, { isPublic: false, isAuthenticated: true });
  res.status(statusCodes.OK).json({ user: updatedUser });
};
