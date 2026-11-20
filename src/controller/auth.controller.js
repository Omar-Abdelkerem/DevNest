import statusCodes from "http-status-codes";
import prisma from "../config/prisma.client.js";
import {
  hashPassword,
  comparePassword,
} from "../utils/password-hashing.util.js";
import { authSchema, loginSchema } from "../schemas/auth.schema.js";
import { unauthenticatedError } from "../errors/index.js";
import {
  createSession,
  deleteSession,
  SESSION_TTL_SECONDS,
} from "../utils/session.util.js";

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: SESSION_TTL_SECONDS * 1000,
};

const safeUserSelect = {
  id: true,
  username: true,
  email: true,
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
};

export const register = async (req, res) => {
  const validatedData = authSchema.parse(req.body);
  const hashedPassword = await hashPassword(validatedData.password);

  const user = await prisma.user.create({
    data: {
      username: validatedData.username,
      email: validatedData.email,
      passwordHash: hashedPassword,
    },
    select: safeUserSelect,
  });

  const sessionId = await createSession(user.id);
  res.cookie("sessionId", sessionId, cookieOptions);
  res.setHeader("Cache-Control", "private, no-store");
  res.status(statusCodes.CREATED).json({ user });
};

export const login = async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    select: {
      ...safeUserSelect,
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

  // Always issue a brand-new session identifier on login (prevents session fixation)
  const existingSessionId = req.cookies?.sessionId;
  if (existingSessionId) {
    await deleteSession(existingSessionId);
  }

  const sessionId = await createSession(user.id);
  res.cookie("sessionId", sessionId, cookieOptions);
  res.setHeader("Cache-Control", "private, no-store");

  const { passwordHash: _passwordHash, ...safeUser } = user;
  res.status(statusCodes.OK).json({ user: safeUser });
};

export const logout = async (req, res) => {
  const sessionId = req.cookies?.sessionId;
  if (sessionId) {
    await deleteSession(sessionId);
  }
  res.clearCookie("sessionId", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });
  res.setHeader("Cache-Control", "private, no-store");
  res.status(statusCodes.OK).json({ message: "Logged out successfully" });
};
