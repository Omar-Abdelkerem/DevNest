import prisma from "../config/prisma.client.js";
import statusCodes from "http-status-codes";
import {
  hashPassword,
  comparePassword,
} from "../utils/password-hashing.util.js";
import { authSchema } from "../schemas/auth.schema.js";
import { unauthenticatedError } from "../errors/index.js";
import { createSession } from "../utils/session.util.js";
import { SESSION_TTL_SECONDS, deleteSession } from "../utils/session.util.js";

export const register = async (req, res) => {
  const validatedData = authSchema.parse(req.body);
  const hashedPassword = await hashPassword(validatedData.password);
  const user = await prisma.user.create({
    data: {
      username: validatedData.username,
      email: validatedData.email,
      passwordHash: hashedPassword,
    },
    select: {
      id: true,
      username: true,
      email: true,
      bio: true,
      avatarUrl: true,
      isPublic: true,
      createdAt: true,
    },
  });
  const sessionId = await createSession(user.id);
  res.cookie("sessionId", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS * 1000, // Convert seconds to milliseconds
  });
  res.status(statusCodes.CREATED).json({ user });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      username: true,
      email: true,
      bio: true,
      avatarUrl: true,
      isPublic: true,
      createdAt: true,
      passwordHash: true,
    },
  });

  if (!user) {
    throw new unauthenticatedError("Invalid credentials");
  }
  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    throw new unauthenticatedError("Invalid credentials");
  }
  const sessionId = await createSession(user.id);
  res.cookie("sessionId", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS * 1000, // Convert seconds to milliseconds
  });
  const { passwordHash, ...safeUser } = user; // strip it out before sending
  res.status(statusCodes.OK).json({ user: safeUser });
};

export const logout = async (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (sessionId) {
    await deleteSession(sessionId);
  }
  res.clearCookie("sessionId", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.status(statusCodes.OK).json({ message: "Logged out successfully" });
};
