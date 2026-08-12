import * as z from "zod";

export const commentIdSchema = z.object({
  id: z.string().uuid("Invalid comment ID"),
});
export const addCommentSchema = z.object({
  content: z.string().min(1, "Content is required"),
  projectId: z.string().uuid("Invalid project ID"),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, "Content is required").optional(),
});
