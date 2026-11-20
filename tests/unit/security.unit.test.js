import { describe, expect, test, beforeEach, afterEach } from "@jest/globals";
import {
  hashPassword,
  comparePassword,
} from "../../src/utils/password-hashing.util.js";
import { detectImageMimeFromBytes } from "../../src/middleware/upload.middleware.js";
import { containsNulByte } from "../../src/middleware/sanitize-input.middleware.js";
import {
  createSession,
  getSession,
  deleteSession,
  invalidateAllUserSessions,
  clearMemorySessions,
} from "../../src/utils/session.util.js";
import { validateProductionEnv } from "../../src/config/env.js";
import { authSchema, loginSchema } from "../../src/schemas/auth.schema.js";
import { updateUserSchema } from "../../src/schemas/user.schema.js";
import { addProjectSchema, updateProjectSchema } from "../../src/schemas/project.schema.js";

describe("Unit Tests — Security, Validation & Session Logic", () => {
  beforeEach(() => {
    clearMemorySessions();
  });

  describe("Password hashing (bcrypt)", () => {
    test("hashes password into salted bcrypt string and verifies match", async () => {
      const hash = await hashPassword("MySecurePass123");
      expect(hash).not.toBe("MySecurePass123");
      expect(hash.startsWith("$2")).toBe(true);
      expect(await comparePassword("MySecurePass123", hash)).toBe(true);
      expect(await comparePassword("WrongPassword", hash)).toBe(false);
    });
  });

  describe("Magic-byte image signature verification", () => {
    test("accepts valid JPEG, PNG, WebP, and GIF signatures", () => {
      const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
      const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")]);
      const gif = Buffer.from("GIF89a000000");

      expect(detectImageMimeFromBytes(jpeg)).toBe("image/jpeg");
      expect(detectImageMimeFromBytes(png)).toBe("image/png");
      expect(detectImageMimeFromBytes(webp)).toBe("image/webp");
      expect(detectImageMimeFromBytes(gif)).toBe("image/gif");
    });

    test("rejects spoofed executable, HTML/SVG script, and empty buffers", () => {
      const exe = Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00");
      const svg = Buffer.from("<svg onload=alert(1)></svg>");
      const html = Buffer.from("<html><script>alert(1)</script></html>");

      expect(detectImageMimeFromBytes(exe)).toBeNull();
      expect(detectImageMimeFromBytes(svg)).toBeNull();
      expect(detectImageMimeFromBytes(html)).toBeNull();
      expect(detectImageMimeFromBytes(Buffer.from("short"))).toBeNull();
    });
  });

  describe("NUL-byte detection", () => {
    test("detects NUL bytes in strings, nested objects, keys, and arrays", () => {
      expect(containsNulByte("hello\u0000world")).toBe(true);
      expect(containsNulByte({ nested: { arr: ["ok", "bad\u0000"] } })).toBe(true);
      expect(containsNulByte({ "bad\u0000key": "ok" })).toBe(true);
      expect(containsNulByte({ clean: ["hello", 123, true] })).toBe(false);
    });
  });

  describe("Strict Zod schemas (mass assignment & XSS URL guards)", () => {
    test("authSchema rejects extra undeclared fields (mass assignment)", () => {
      const res = authSchema.safeParse({
        username: "alice_dev",
        email: "alice@example.com",
        password: "password123",
        isAdmin: true,
      });
      expect(res.success).toBe(false);
    });

    test("loginSchema rejects missing password or invalid email", () => {
      expect(loginSchema.safeParse({ email: "not-an-email", password: "abc" }).success).toBe(false);
      expect(loginSchema.safeParse({ email: "a@b.com" }).success).toBe(false);
    });

    test("updateUserSchema validates new sidebar fields and blocks javascript: URLs", () => {
      const valid = updateUserSchema.safeParse({
        location: "Cairo, Egypt",
        age: 23,
        role: "Backend Engineer",
        company: "DevNest",
        availableForWork: true,
        links: ["https://github.com/alice"],
      });
      expect(valid.success).toBe(true);

      const xssUrl = updateUserSchema.safeParse({
        links: ["javascript:alert(1)"],
      });
      expect(xssUrl.success).toBe(false);

      const badAge = updateUserSchema.safeParse({ age: 5 });
      expect(badAge.success).toBe(false);

      const extraField = updateUserSchema.safeParse({ role: "Eng", passwordHash: "hacked" });
      expect(extraField.success).toBe(false);
    });

    test("project schemas validate cover photo URL, optional links, and reject extra fields", () => {
      const valid = addProjectSchema.safeParse({
        title: "DevNest",
        description: "Portfolio app",
        projectimgUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        links: [{ name: "Live Demo", url: "https://devnest.app" }],
        languages: ["TypeScript", "Node.js"],
      });
      expect(valid.success).toBe(true);

      const badLink = addProjectSchema.safeParse({
        title: "Bad",
        links: [{ name: "XSS", url: "javascript:alert(1)" }],
      });
      expect(badLink.success).toBe(false);

      const massAssign = updateProjectSchema.safeParse({
        title: "Updated",
        userId: "11111111-1111-4111-8111-111111111111",
      });
      expect(massAssign.success).toBe(false);
    });
  });

  describe("Session lifecycle & multi-session invalidation", () => {
    test("issues unique session IDs and revokes all other sessions on password change", async () => {
      const s1 = await createSession("user-1");
      const s2 = await createSession("user-1");
      const s3 = await createSession("user-2");

      expect(s1).not.toBe(s2);
      expect(await getSession(s1)).toMatchObject({ userId: "user-1" });
      expect(await getSession(s2)).toMatchObject({ userId: "user-1" });

      // Password change on s1 invalidates s2, keeps s1 and user-2's s3
      await invalidateAllUserSessions("user-1", s1);
      expect(await getSession(s1)).toMatchObject({ userId: "user-1" });
      expect(await getSession(s2)).toBeNull();
      expect(await getSession(s3)).toMatchObject({ userId: "user-2" });

      // Logout deletes s1
      await deleteSession(s1);
      expect(await getSession(s1)).toBeNull();
    });
  });

  describe("Boot-time production environment guard", () => {
    const origEnv = { ...process.env };
    afterEach(() => {
      process.env = { ...origEnv };
    });

    test("refuses to start in production when DATABASE_URL is missing or CORS is wildcard", () => {
      process.env.NODE_ENV = "production";
      delete process.env.DATABASE_URL;
      process.env.CORS_ORIGINS = "*";
      expect(() => validateProductionEnv()).toThrow(/Insecure production configuration/);
    });
  });
});
