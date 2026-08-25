import express from "express";
import {
  getUserById,
  updateCurrentUser,
  getCurrentUser,
} from "../controller/user.controller.js";
import { getAllProjectsByUsername } from "../controller/project.controller.js";
import { getAllSkillsbyUsername } from "../controller/skills.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import optionalAuthMiddleware from "../middleware/optionalAuth.middleware.js";
import uploadAvatar from "../middleware/upload.middleware.js";
import { updateAvatar } from "../controller/user.controller.js";
import { getUserByUsername } from "../controller/user.controller.js";
const router = express.Router();

router.get("/me", authMiddleware, getCurrentUser);
router.patch("/me", authMiddleware, updateCurrentUser);
router.patch("/me/avatar", authMiddleware, uploadAvatar, updateAvatar);
router.get("/:username", optionalAuthMiddleware, getUserByUsername);
router.get("/:id", authMiddleware, getUserById);
router.get("/:username/projects", authMiddleware, getAllProjectsByUsername);
router.get("/:username/skills", authMiddleware, getAllSkillsbyUsername);

export default router;
