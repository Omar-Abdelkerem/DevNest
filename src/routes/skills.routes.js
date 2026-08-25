import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import optionalAuthMiddleware from "../middleware/optionalAuth.middleware.js";
import {
  addSkill,
  getSkillById,
  updateSkillById,
  deleteSkillById,
} from "../controller/skills.controller.js";
import { skillIdSchema } from "../schemas/skills.schema.js";
import checkOwnership from "../middleware/check-ownership.middleware.js";
import prisma from "../config/prisma.client.js";

const getSkillResource = async (id) => {
  return await prisma.skill.findUnique({
    where: { id: id },
  });
};
const checkSkillOwnership = checkOwnership(
  getSkillResource,
  "userId",
  skillIdSchema,
);

const router = express.Router();

router.post("/", authMiddleware, addSkill);
router.patch("/:id", authMiddleware, checkSkillOwnership, updateSkillById);
router.delete("/:id", authMiddleware, checkSkillOwnership, deleteSkillById);
router.get("/:id", optionalAuthMiddleware, getSkillById);

export default router;
