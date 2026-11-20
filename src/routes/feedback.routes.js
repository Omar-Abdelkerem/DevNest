import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import optionalAuthMiddleware from "../middleware/optionalAuth.middleware.js";
import { writeLimiter } from "../config/rateLimiter.js";
import {
  addFeedback,
  getFeedbackForUser,
  deleteFeedback,
} from "../controller/feedback.controller.js";

const router = express.Router();

router.post("/", authMiddleware, writeLimiter, addFeedback);
router.get("/user/:username", optionalAuthMiddleware, getFeedbackForUser);
router.delete("/:id", authMiddleware, deleteFeedback);

export default router;
