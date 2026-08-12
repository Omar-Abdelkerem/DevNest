import prisma from "../config/prisma.client.js";
import statusCodes from "http-status-codes";
import { createJWT } from "../utils/jwt.util.js";
import {
  hashPassword,
  comparePassword,
} from "../utils/password-hashing.util.js";
import { authSchema } from "../schemas/auth.schema.js";
import { unauthenticatedError } from "../errors/index.js";

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
  const token = createJWT({ userId: user.id });
  res.status(statusCodes.CREATED).json({ user, token });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new unauthenticatedError("Invalid credentials");
  }
  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    throw new unauthenticatedError("Invalid credentials");
  }
  const token = createJWT({ userId: user.id });
  res.status(statusCodes.OK).json({ user: { username: user.username }, token });
};
