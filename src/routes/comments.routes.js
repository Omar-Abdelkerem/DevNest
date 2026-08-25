import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import optionalAuthMiddleware from "../middleware/optionalAuth.middleware.js";
import {
  addComment,
  updateCommentById,
  deleteCommentById,
  getCommentById,
} from "../controller/comments.controller.js";
import prisma from "../config/prisma.client.js";
import checkOwnership from "../middleware/check-ownership.middleware.js";
import { commentIdSchema } from "../schemas/comments.schema.js";

const routeResource = async (id) => {
  return prisma.comment.findUnique({
    where: {
      id: id,
    },
  });
};

const checkCommentOwnership = checkOwnership(
  routeResource,
  "userId",
  commentIdSchema,
);

const router = express.Router();

router.post("/", authMiddleware, addComment);
router.patch("/:id", authMiddleware, checkCommentOwnership, updateCommentById);
router.delete("/:id", authMiddleware, checkCommentOwnership, deleteCommentById);
router.get("/:id", optionalAuthMiddleware, getCommentById);

export default router;
