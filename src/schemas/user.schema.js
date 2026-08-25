import * as z from "zod";

export const userIdSchema = z.object({
  id: z.string().uuid("Invalid user ID"),
});
export const updateUserSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters long")
    .optional(),
  email: z.string().email("Invalid email address").optional(),
  bio: z
    .string()
    .max(160, { message: "Bio cannot exceed 160 characters." })
    .optional()
    .nullable(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .max(20, "Password must be at most 20 characters long")
    .optional(),
  avatarUrl: z.string().url("Invalid URL").optional(),
  links: z.array(z.string().url("Invalid URL")).optional(),
  isPublic: z.boolean().optional(),
  about: z.string().max(1500, "About section is too long").optional(),
  skills: z
    .array(
      z.object({
        name: z.string(),
        level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
      }),
    )
    .optional(),
});
