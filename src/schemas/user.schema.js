import * as z from "zod";
import { safeHttpUrl } from "./auth.schema.js";

export const userIdSchema = z
  .object({
    id: z.string().uuid("Invalid user ID"),
  })
  .strict();

export const updateUserSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters long")
      .max(30, "Username must be at most 30 characters long")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Username can only contain letters, numbers, hyphens, and underscores",
      )
      .optional(),
    email: z.string().trim().email("Invalid email address").max(255).optional(),
    bio: z
      .string()
      .trim()
      .max(160, { message: "Bio cannot exceed 160 characters." })
      .optional()
      .nullable(),
    about: z
      .string()
      .trim()
      .max(1500, "About section cannot exceed 1500 characters.")
      .optional()
      .nullable(),
    location: z
      .string()
      .trim()
      .max(100, "Location cannot exceed 100 characters.")
      .optional()
      .nullable(),
    age: z
      .number()
      .int("Age must be a whole number")
      .min(13, "Age must be at least 13")
      .max(120, "Age must be at most 120")
      .optional()
      .nullable(),
    role: z
      .string()
      .trim()
      .max(80, "Role cannot exceed 80 characters.")
      .optional()
      .nullable(),
    company: z
      .string()
      .trim()
      .max(80, "Company cannot exceed 80 characters.")
      .optional()
      .nullable(),
    availableForWork: z.boolean().optional(),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters long")
      .max(20, "Password must be at most 20 characters long")
      .optional(),
    avatarUrl: safeHttpUrl.optional().nullable(),
    links: z.array(safeHttpUrl).max(10, "Maximum 10 links allowed").optional(),
    isPublic: z.boolean().optional(),
    skills: z
      .array(
        z
          .object({
            name: z.string().trim().min(1, "Skill name is required").max(50),
            level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
          })
          .strict(),
      )
      .max(30, "Maximum 30 skills allowed")
      .optional(),
  })
  .strict();
