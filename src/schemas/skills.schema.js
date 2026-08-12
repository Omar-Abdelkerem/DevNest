import * as z from "zod";

export const skillIdSchema = z.object({
  id: z.string().uuid("Invalid skill ID"),
});

export const addSkillSchema = z.object({
  name: z.string().min(1, { message: "Skill name is required" }),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"], {
    message:
      "Level is required and must be one of BEGINNER, INTERMEDIATE, ADVANCED, EXPERT",
  }),
});

export const updateSkillSchema = z.object({
  name: z.string().min(1, { message: "Skill name is required" }).optional(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]).optional(),
});
