import * as z from "zod";

export const commentIdSchema = z
  .object({
    id: z.string().uuid("Invalid comment ID"),
  })
  .strict();

export const addCommentSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "Content is required")
      .max(2000, "Comment cannot exceed 2000 characters"),
    projectId: z.string().uuid("Invalid project ID"),
  })
  .strict();

export const updateCommentSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "Content is required")
      .max(2000, "Comment cannot exceed 2000 characters"),
  })
  .strict();
