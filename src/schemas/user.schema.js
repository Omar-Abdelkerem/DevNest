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
    .max(160, "Bio must be at most 160 characters long")
    .optional(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .max(20, "Password must be at most 20 characters long")
    .optional(),
  avatarUrl: z.string().url("Invalid URL").optional(),
  links: z.array(z.string().url("Invalid URL")).optional(),
});
