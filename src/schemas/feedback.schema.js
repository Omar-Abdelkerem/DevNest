import { z } from "zod";

export const addFeedbackSchema = z.object({
  content: z
    .string()
    .min(1, "Feedback cannot be empty")
    .max(500, "Feedback is too long"),
  recipientId: z.string().uuid("Invalid user ID"),
});

export const feedbackIdSchema = z.object({
  id: z.string().uuid("Invalid feedback ID"),
});
