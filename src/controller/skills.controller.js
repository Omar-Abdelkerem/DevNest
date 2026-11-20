import statusCodes from "http-status-codes";
import prisma from "../config/prisma.client.js";
import { notFoundError, unauthorizedError } from "../errors/index.js";
import {
  addSkillSchema,
  updateSkillSchema,
  skillIdSchema,
} from "../schemas/skills.schema.js";
import { setCacheHeaders } from "../middleware/cache-headers.middleware.js";

export const addSkill = async (req, res) => {
  const validatedData = addSkillSchema.parse(req.body);
  const skill = await prisma.skill.create({
    data: { ...validatedData, userId: req.user.userId },
  });
  res.status(statusCodes.CREATED).json(skill);
};

export const updateSkillById = async (req, res) => {
  const validatedData = updateSkillSchema.parse(req.body);
  const skill = await prisma.skill.update({
    where: { id: req.resource.id },
    data: validatedData,
  });
  res.status(statusCodes.OK).json(skill);
};

export const deleteSkillById = async (req, res) => {
  await prisma.skill.delete({
    where: { id: req.resource.id },
  });
  res.status(statusCodes.NO_CONTENT).send();
};

export const getSkillById = async (req, res) => {
  const { id } = skillIdSchema.parse(req.params);

  const skill = await prisma.skill.findUnique({
    where: { id },
    include: { user: { select: { isPublic: true } } },
  });

  if (!skill) {
    throw new notFoundError(`Skill with id ${id} not found`);
  }

  const requesterId = req.user?.userId || req.user?.id;
  if (!skill.user.isPublic && skill.userId !== requesterId) {
    throw new unauthorizedError("This profile is private.");
  }

  setCacheHeaders(res, {
    isPublic: skill.user.isPublic,
    isAuthenticated: Boolean(requesterId),
    maxAge: 60,
  });
  res.status(statusCodes.OK).json(skill);
};

export const getAllSkillsbyUsername = async (req, res) => {
  const { username } = req.params;
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, isPublic: true },
  });

  if (!user) {
    throw new notFoundError(`User with username ${username} not found`);
  }

  const requesterId = req.user?.userId || req.user?.id;
  if (!user.isPublic && user.id !== requesterId) {
    throw new unauthorizedError("This profile is private.");
  }

  const skills = await prisma.skill.findMany({
    where: { userId: user.id },
    take: 50,
  });

  setCacheHeaders(res, {
    isPublic: user.isPublic,
    isAuthenticated: Boolean(requesterId),
    maxAge: 60,
  });
  res.status(statusCodes.OK).json(skills);
};
