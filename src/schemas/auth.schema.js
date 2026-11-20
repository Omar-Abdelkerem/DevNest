import * as z from "zod";

export const safeHttpUrl = z
  .string()
  .trim()
  .url("Invalid URL format")
  .max(2048, "URL is too long")
  .refine(
    (val) => {
      try {
        const parsed = new URL(val);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL must start with http:// or https://" },
  );

export const authSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters long")
      .max(30, "Username must be at most 30 characters long")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Username can only contain letters, numbers, hyphens, and underscores",
      ),
    email: z.string().trim().email("Invalid email address").max(255),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters long")
      .max(20, "Password must be at most 20 characters long"),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().email("Invalid email address").max(255),
    password: z.string().min(1, "Password is required").max(128),
  })
  .strict();
