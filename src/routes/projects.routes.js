import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import optionalAuthMiddleware from "../middleware/optionalAuth.middleware.js";
import { uploadProjectImage } from "../middleware/upload.middleware.js";
import { writeLimiter } from "../config/rateLimiter.js";
import {
  addProject,
  getProjectById,
  updateProjectById,
  deleteProjectById,
  getAllProjects,
  getFeaturedProjects,
  getStarredProjects,
  uploadProjectPhoto,
} from "../controller/project.controller.js";
import prisma from "../config/prisma.client.js";
import { projectIdSchema } from "../schemas/project.schema.js";
import checkOwnership from "../middleware/check-ownership.middleware.js";
import { getAllCommentsByProjectId } from "../controller/comments.controller.js";
import { addStar, removeStar } from "../controller/star.controller.js";

const routeResource = async (id) => {
  return prisma.project.findUnique({
    where: { id },
  });
};

const checkProjectOwnership = checkOwnership(
  routeResource,
  "userId",
  projectIdSchema,
);

const router = express.Router();

router.post("/upload-image", authMiddleware, writeLimiter, uploadProjectImage, uploadProjectPhoto);
router.post("/", authMiddleware, writeLimiter, addProject);
router.get("/", optionalAuthMiddleware, getAllProjects);
router.get("/starred/me", authMiddleware, getStarredProjects);
router.get("/featured", getFeaturedProjects);
router.get("/:id", optionalAuthMiddleware, getProjectById);
router.patch("/:id", authMiddleware, checkProjectOwnership, updateProjectById);
router.delete("/:id", authMiddleware, checkProjectOwnership, deleteProjectById);
router.get("/:id/comments", optionalAuthMiddleware, getAllCommentsByProjectId);
router.post("/:id/star", authMiddleware, writeLimiter, addStar);
router.delete("/:id/star", authMiddleware, writeLimiter, removeStar);

export default router;
