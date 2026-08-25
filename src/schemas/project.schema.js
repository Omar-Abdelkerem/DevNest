import * as z from "zod";
export const projectIdSchema = z.object({
  id: z.string().uuid("Invalid project ID"),
});
export const addProjectSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().optional(),
  status: z.enum(["not started", "in progress", "completed"]).optional(),
  projectimgUrl: z.string().optional(),
  links: z
    .array(
      z.object({
        name: z.string().min(1, { message: "Link name is required" }),
        url: z.string().url({ message: "Invalid URL format" }),
      }),
    )
    .optional(),
  readme: z.string().optional(),
  isPublic: z.boolean().optional(),
  languages: z.array(z.string().min(1)).optional(), // e.g. ["Rust", "Go"]
});
export const updateProjectSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }).optional(),
  description: z.string().optional(),
  projectimgUrl: z.string().optional(),
  links: z
    .array(
      z.object({
        name: z.string().min(1, { message: "Link name is required" }),
        url: z.string().url({ message: "Invalid URL format" }),
      }),
    )
    .optional(),
  readme: z.string().optional(),
  isPublic: z.boolean().optional(),
  languages: z.array(z.string().min(1)).optional(),
});
