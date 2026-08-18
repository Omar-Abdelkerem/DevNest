import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  addProject,
  getProjectById,
  updateProjectById,
  deleteProjectById,
} from "../controller/project.controller.js";
import prisma from "../config/prisma.client.js";
import { projectIdSchema } from "../schemas/project.schema.js";
import checkOwnership from "../middleware/check-ownership.middleware.js";
import { getAllCommentsByProjectId } from "../controller/comments.controller.js";
import { addStar, removeStar } from "../controller/star.controller.js";

const routeResource = async (id) => {
  return prisma.project.findUnique({
    where: {
      id: id,
    },
  });
};
const checkProjectOwnership = checkOwnership(
  routeResource,
  "userId",
  projectIdSchema,
);

const router = express.Router();

router.post("/", authMiddleware, addProject);
router.patch("/:id", authMiddleware, checkProjectOwnership, updateProjectById);
router.delete("/:id", authMiddleware, checkProjectOwnership, deleteProjectById);
router.get("/:id", authMiddleware, getProjectById);
router.get("/:id/comments", authMiddleware, getAllCommentsByProjectId);
router.post("/:id/star", authMiddleware, addStar);
router.delete("/:id/star", authMiddleware, removeStar);

export default router;
