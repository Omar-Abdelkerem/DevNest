import * as z from "zod";
import { safeHttpUrl } from "./auth.schema.js";

export const userIdSchema = z
  .object({
    id: z.string().uuid("Invalid user ID"),
  })
  .strict();

const optionalTrimmedString = (max, msg) =>
  z
    .union([z.string().trim().max(max, msg), z.null()])
    .transform((val) => (val === "" ? null : val))
    .optional();

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
    headline: optionalTrimmedString(120, "Headline cannot exceed 120 characters."),
    bio: optionalTrimmedString(160, "Bio cannot exceed 160 characters."),
    about: optionalTrimmedString(1500, "About section cannot exceed 1500 characters."),
    location: optionalTrimmedString(100, "Location cannot exceed 100 characters."),
    age: z
      .union([
        z
          .number()
          .int("Age must be a whole number")
          .min(13, "Age must be at least 13")
          .max(120, "Age must be at most 120"),
        z.null(),
      ])
      .optional(),
    role: optionalTrimmedString(80, "Role cannot exceed 80 characters."),
    company: optionalTrimmedString(80, "Company cannot exceed 80 characters."),
    education: optionalTrimmedString(120, "Education cannot exceed 120 characters."),
    yearsOfExperience: z
      .union([
        z
          .number()
          .int("Years of experience must be a whole number")
          .min(0, "Years of experience cannot be negative")
          .max(60, "Years of experience cannot exceed 60"),
        z.null(),
      ])
      .optional(),
    workPreferences: optionalTrimmedString(120, "Work preferences cannot exceed 120 characters."),
    phone: optionalTrimmedString(40, "Phone number cannot exceed 40 characters."),
    whatsapp: optionalTrimmedString(100, "WhatsApp cannot exceed 100 characters."),
    contactEmail: z
      .union([
        z.string().trim().email("Invalid contact email").max(255),
        z.literal(""),
        z.null(),
      ])
      .transform((val) => (val === "" ? null : val))
      .optional(),
    resumeUrl: z
      .union([safeHttpUrl, z.literal(""), z.null()])
      .transform((val) => (val === "" ? null : val))
      .optional(),
    ctaMessage: optionalTrimmedString(240, "CTA message cannot exceed 240 characters."),
    availableForWork: z.boolean().optional(),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters long")
      .max(20, "Password must be at most 20 characters long")
      .optional(),
    avatarUrl: z
      .union([safeHttpUrl, z.literal(""), z.null()])
      .transform((val) => (val === "" ? null : val))
      .optional(),
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
