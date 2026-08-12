import prisma from "../config/prisma.client.js";
import statusCodes from "http-status-codes";
import { notFoundError, unauthorizedError } from "../errors/index.js";
import {
  addSkillSchema,
  updateSkillSchema,
  skillIdSchema,
} from "../schemas/skills.schema.js";

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
    where: { id: id },
    include: { user: { select: { isPublic: true } } },
  });

  if (!skill) {
    throw new notFoundError(`Skill with id ${id} not found`);
  }
  if (!skill.user.isPublic && skill.userId !== req.user.userId) {
    throw new unauthorizedError("This profile is private.");
  }

  res.status(statusCodes.OK).json(skill);
};

export const getAllSkillsbyUsername = async (req, res) => {
  const { username } = req.params;
  const user = await prisma.user.findUnique({
    where: { username: username },
  });

  if (!user) {
    throw new notFoundError(`User with username ${username} not found`);
  }
  if (!user.isPublic && user.id !== req.user.userId) {
    throw new unauthorizedError("This profile is private.");
  }

  const skills = await prisma.skill.findMany({
    where: { userId: user.id },
  });
  res.status(statusCodes.OK).json(skills);
};
