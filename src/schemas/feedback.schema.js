import { z } from "zod";

export const addFeedbackSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "Feedback cannot be empty")
      .max(500, "Feedback cannot exceed 500 characters"),
    recipientId: z.string().uuid("Invalid user ID"),
  })
  .strict();

export const feedbackIdSchema = z
  .object({
    id: z.string().uuid("Invalid feedback ID"),
  })
  .strict();
