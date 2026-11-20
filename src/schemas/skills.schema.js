import * as z from "zod";

export const skillIdSchema = z
  .object({
    id: z.string().uuid("Invalid skill ID"),
  })
  .strict();

export const addSkillSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: "Skill name is required" })
      .max(50, { message: "Skill name cannot exceed 50 characters" }),
    level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"], {
      message:
        "Level is required and must be one of BEGINNER, INTERMEDIATE, ADVANCED, EXPERT",
    }),
  })
  .strict();

export const updateSkillSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: "Skill name is required" })
      .max(50, { message: "Skill name cannot exceed 50 characters" })
      .optional(),
    level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]).optional(),
  })
  .strict();
