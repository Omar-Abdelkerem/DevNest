import * as z from "zod";
import { safeHttpUrl } from "./auth.schema.js";

export const projectIdSchema = z
  .object({
    id: z.string().uuid("Invalid project ID"),
  })
  .strict();

const projectLinkSchema = z
  .object({
    name: z.string().trim().min(1, { message: "Link name is required" }).max(50),
    url: safeHttpUrl,
  })
  .strict();

const optionalImageUrl = z
  .union([safeHttpUrl, z.literal(""), z.null()])
  .transform((val) => (val === "" ? null : val))
  .optional();

export const addProjectSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: "Title is required" })
      .max(120, { message: "Title cannot exceed 120 characters" }),
    description: z
      .string()
      .trim()
      .max(500, { message: "Description cannot exceed 500 characters" })
      .optional()
      .nullable(),
    status: z.enum(["not started", "in progress", "completed"]).optional(),
    projectimgUrl: optionalImageUrl,
    links: z
      .array(projectLinkSchema)
      .max(10, "Maximum 10 links allowed")
      .optional(),
    readme: z
      .string()
      .max(50000, { message: "Readme cannot exceed 50,000 characters" })
      .optional()
      .nullable(),
    isPublic: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(10000).optional(),
    languages: z
      .array(z.string().trim().min(1).max(40))
      .max(15, "Maximum 15 languages allowed")
      .optional(),
  })
  .strict();

export const updateProjectSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: "Title is required" })
      .max(120, { message: "Title cannot exceed 120 characters" })
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, { message: "Description cannot exceed 500 characters" })
      .optional()
      .nullable(),
    projectimgUrl: optionalImageUrl,
    links: z
      .array(projectLinkSchema)
      .max(10, "Maximum 10 links allowed")
      .optional(),
    readme: z
      .string()
      .max(50000, { message: "Readme cannot exceed 50,000 characters" })
      .optional()
      .nullable(),
    isPublic: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(10000).optional(),
    languages: z
      .array(z.string().trim().min(1).max(40))
      .max(15, "Maximum 15 languages allowed")
      .optional(),
  })
  .strict();

export const reorderProjectsSchema = z
  .object({
    projectIds: z
      .array(z.string().uuid("Invalid project ID"))
      .min(1, "At least one project ID is required")
      .max(100, "Maximum 100 projects can be reordered at once"),
  })
  .strict();
