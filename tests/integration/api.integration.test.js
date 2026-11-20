import { jest, describe, expect, test, beforeEach } from "@jest/globals";
import request from "supertest";
import { createInMemoryPrisma } from "../helpers/inMemoryPrisma.js";

const prismaMock = createInMemoryPrisma();

await jest.unstable_mockModule("../../src/config/prisma.client.js", () => ({
  default: prismaMock,
}));

const { clearMemorySessions } = await import("../../src/utils/session.util.js");
const { clearMemoryCache } = await import("../../src/utils/cache.util.js");
const { default: app } = await import("../../src/app.js");

function extractSessionCookie(res) {
  const cookies = res.headers["set-cookie"] || [];
  const raw = cookies.find((c) => c.startsWith("sessionId="));
  return raw ? raw.split(";")[0] : "";
}

async function registerUser(overrides = {}) {
  const payload = {
    username: overrides.username || "alice_dev",
    email: overrides.email || "alice@example.com",
    password: overrides.password || "secret123",
  };
  const res = await request(app).post("/api/v1/auth/register").send(payload);
  return { res, cookie: extractSessionCookie(res), user: res.body.user };
}

describe("Integration Tests — Full Express Middleware & API Stack", () => {
  beforeEach(() => {
    prismaMock.reset();
    clearMemorySessions();
    clearMemoryCache();
  });

  describe("Health, Security Headers, Compression & Error Handling", () => {
    test("GET /health returns 200 with security headers (Helmet CSP + X-Frame-Options)", async () => {
      const res = await request(app).get("/health");
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.headers["content-security-policy"]).toContain("default-src 'none'");
      expect(res.headers["x-frame-options"]).toBe("DENY");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
    });

    test("Rejects malformed JSON with clean 400 (never 500)", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .set("Content-Type", "application/json")
        .send("{bad json");
      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toMatch(/Malformed JSON/i);
    });

    test("Rejects NUL bytes in request body with clean 400", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "alice\u0000@example.com",
        password: "secret123",
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toMatch(/Invalid characters/i);
    });

    test("Never leaks stack traces or internal errors on 500", async () => {
      const origFind = prismaMock.user.findUnique;
      prismaMock.user.findUnique = async () => {
        throw new Error("SELECT * FROM secret_internal_table failed at /srv/app/db.js:42");
      };
      const res = await request(app).get("/api/v1/user/somebody");
      prismaMock.user.findUnique = origFind;

      expect(res.statusCode).toBe(500);
      expect(JSON.stringify(res.body)).not.toContain("secret_internal_table");
      expect(JSON.stringify(res.body)).not.toContain("/srv/app");
      expect(res.body.error.message).toBe("Something went wrong. Please try again later.");
    });
  });

  describe("Authentication, Session Lifecycle & CSRF Protection", () => {
    const fakeUuid = "11111111-1111-4111-8111-111111111111";

    test.each([
      ["GET", "/api/v1/user/me"],
      ["PATCH", "/api/v1/user/me"],
      ["PATCH", "/api/v1/user/me/avatar"],
      ["GET", `/api/v1/user/id/${fakeUuid}`],
      ["POST", "/api/v1/projects"],
      ["POST", "/api/v1/projects/upload-image"],
      ["PATCH", `/api/v1/projects/${fakeUuid}`],
      ["DELETE", `/api/v1/projects/${fakeUuid}`],
      ["GET", "/api/v1/projects/starred/me"],
      ["POST", `/api/v1/projects/${fakeUuid}/star`],
      ["DELETE", `/api/v1/projects/${fakeUuid}/star`],
      ["POST", "/api/v1/skills"],
      ["PATCH", `/api/v1/skills/${fakeUuid}`],
      ["DELETE", `/api/v1/skills/${fakeUuid}`],
      ["POST", "/api/v1/comments"],
      ["PATCH", `/api/v1/comments/${fakeUuid}`],
      ["DELETE", `/api/v1/comments/${fakeUuid}`],
      ["POST", "/api/v1/feedback"],
      ["DELETE", `/api/v1/feedback/${fakeUuid}`],
    ])("Rejects missing/invalid session on %s %s with 401", async (method, url) => {
      const res = await request(app)[method.toLowerCase()](url).set(
        "Cookie",
        "sessionId=expired-or-invalid-id",
      );
      expect(res.statusCode).toBe(401);
    });

    test("Register, login rotation, logout server-side revocation, and password-change multi-session invalidation", async () => {
      const { res: regRes, cookie: cookie1 } = await registerUser();
      expect(regRes.statusCode).toBe(201);
      expect(cookie1).toMatch(/^sessionId=/);

      // Validation error includes field-level details
      const badReg = await request(app).post("/api/v1/auth/register").send({
        username: "ab",
        email: "bad",
        password: "123",
      });
      expect(badReg.statusCode).toBe(400);
      expect(Array.isArray(badReg.body.error.fields)).toBe(true);
      expect(badReg.body.error.fields.length).toBeGreaterThanOrEqual(1);

      // Duplicate email returns 409
      const dupReg = await request(app).post("/api/v1/auth/register").send({
        username: "alice_two",
        email: "alice@example.com",
        password: "secret123",
      });
      expect(dupReg.statusCode).toBe(409);

      // Second device login issues a distinct session ID (prevents session fixation)
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: "alice@example.com",
        password: "secret123",
      });
      expect(loginRes.statusCode).toBe(200);
      const cookie2 = extractSessionCookie(loginRes);
      expect(cookie2).not.toBe(cookie1);

      // Changing password on device 1 immediately revokes device 2's session
      const pwRes = await request(app)
        .patch("/api/v1/user/me")
        .set("Cookie", cookie1)
        .send({ password: "newPassword99" });
      expect(pwRes.statusCode).toBe(200);

      const device2Check = await request(app).get("/api/v1/user/me").set("Cookie", cookie2);
      expect(device2Check.statusCode).toBe(401);

      const device1Check = await request(app).get("/api/v1/user/me").set("Cookie", cookie1);
      expect(device1Check.statusCode).toBe(200);

      // Logout revokes device 1 server-side
      const logoutRes = await request(app).post("/api/v1/auth/logout").set("Cookie", cookie1);
      expect(logoutRes.statusCode).toBe(200);

      const postLogoutCheck = await request(app).get("/api/v1/user/me").set("Cookie", cookie1);
      expect(postLogoutCheck.statusCode).toBe(401);
    });

    test("CSRF protection rejects cross-origin state-changing request with cookie attached", async () => {
      const { cookie } = await registerUser();
      const csrfRes = await request(app)
        .patch("/api/v1/user/me")
        .set("Cookie", cookie)
        .set("Origin", "https://evil-attacker.example")
        .send({ bio: "Hacked bio" });

      expect(csrfRes.statusCode).toBe(403);
      expect(csrfRes.body.error.message).toMatch(/Cross-site request rejected/i);
    });
  });

  describe("Profile Sidebar Fields, Projects (Photos + Links + Batched Languages), Stars, Comments & Privacy", () => {
    test("Full CRUD lifecycle, privacy enforcement, cache invalidation, and Cache-Control/Vary headers", async () => {
      const { cookie: aliceCookie, user: alice } = await registerUser({
        username: "alice_dev",
        email: "alice@example.com",
      });
      const { cookie: bobCookie } = await registerUser({
        username: "bob_dev",
        email: "bob@example.com",
      });

      // 1. Update Alice's sidebar fields (location, age, role, company, availableForWork)
      const updateProfile = await request(app)
        .patch("/api/v1/user/me")
        .set("Cookie", aliceCookie)
        .send({
          bio: "Systems engineer",
          location: "Cairo, Egypt",
          age: 22,
          role: "Full-Stack Developer",
          company: "DevNest",
          availableForWork: true,
          skills: [{ name: "Node.js", level: "EXPERT" }],
        });
      expect(updateProfile.statusCode).toBe(200);
      expect(updateProfile.body.user).toMatchObject({
        location: "Cairo, Egypt",
        age: 22,
        role: "Full-Stack Developer",
        company: "DevNest",
        availableForWork: true,
      });

      // 2. Reject mass assignment on project creation
      const overpost = await request(app)
        .post("/api/v1/projects")
        .set("Cookie", aliceCookie)
        .send({ title: "Test", userId: "hacked-id" });
      expect(overpost.statusCode).toBe(400);

      // 3. Create project with cover photo, optional links, and multiple languages
      const createProj = await request(app)
        .post("/api/v1/projects")
        .set("Cookie", aliceCookie)
        .send({
          title: "DevNest Engine",
          description: "Fast portfolio backend",
          projectimgUrl: "https://res.cloudinary.com/demo/image/upload/v1/cover.jpg",
          links: [
            { name: "Live Demo", url: "https://devnest-web-xi.vercel.app" },
            { name: "GitHub", url: "https://github.com/Omar-Abdelkerem/DevNest" },
          ],
          languages: ["JavaScript", "PostgreSQL", "Redis"],
          isPublic: true,
        });
      expect(createProj.statusCode).toBe(201);
      const projectId = createProj.body.id;
      expect(createProj.body.projectimgUrl).toContain("cover.jpg");
      expect(createProj.body.links).toHaveLength(2);
      expect(createProj.body.languages).toEqual(["JavaScript", "PostgreSQL", "Redis"]);

      // 4. Anonymous public read gets public Cache-Control + Vary: Cookie
      const anonProj = await request(app).get(`/api/v1/projects/${projectId}`);
      expect(anonProj.statusCode).toBe(200);
      expect(anonProj.headers["vary"]).toContain("Cookie");
      expect(anonProj.headers["cache-control"]).toContain("public");
      expect(anonProj.body.stars).toBe(0);

      // 5. Bob stars the project -> single-project cache MUST invalidate immediately
      const starRes = await request(app)
        .post(`/api/v1/projects/${projectId}/star`)
        .set("Cookie", bobCookie);
      expect(starRes.statusCode).toBe(201);

      const afterStar = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set("Cookie", bobCookie);
      expect(afterStar.statusCode).toBe(200);
      expect(afterStar.headers["cache-control"]).toContain("private, no-store");
      expect(afterStar.body.stars).toBe(1);
      expect(afterStar.body.hasStarred).toBe(true);

      // 6. Bob comments on project & unauthenticated user can read comment by ID without 500 crash
      const commentRes = await request(app)
        .post("/api/v1/comments")
        .set("Cookie", bobCookie)
        .send({ projectId, content: "Great architecture!" });
      expect(commentRes.statusCode).toBe(201);

      const anonComment = await request(app).get(`/api/v1/comments/${commentRes.body.id}`);
      expect(anonComment.statusCode).toBe(200);

      // 7. Bob leaves feedback on Alice's profile; Alice cannot leave feedback on herself
      const selfFb = await request(app)
        .post("/api/v1/feedback")
        .set("Cookie", aliceCookie)
        .send({ recipientId: alice.id, content: "Self praise" });
      expect(selfFb.statusCode).toBe(400);

      const bobFb = await request(app)
        .post("/api/v1/feedback")
        .set("Cookie", bobCookie)
        .send({ recipientId: alice.id, content: "Awesome portfolio!" });
      expect(bobFb.statusCode).toBe(201);

      // 8. Alice sets profile to private -> stranger gets 403 on profile, projects, skills, and feedback
      await request(app)
        .patch("/api/v1/user/me")
        .set("Cookie", aliceCookie)
        .send({ isPublic: false });

      expect((await request(app).get("/api/v1/user/alice_dev")).statusCode).toBe(403);
      expect((await request(app).get("/api/v1/user/alice_dev/projects")).statusCode).toBe(403);
      expect((await request(app).get("/api/v1/user/alice_dev/skills")).statusCode).toBe(403);
      expect((await request(app).get("/api/v1/feedback/user/alice_dev")).statusCode).toBe(403);

      // 9. Bob cannot edit or delete Alice's project
      const bobEdit = await request(app)
        .patch(`/api/v1/projects/${projectId}`)
        .set("Cookie", bobCookie)
        .send({ title: "Hijacked" });
      expect(bobEdit.statusCode).toBe(403);

      // 10. Alice deletes her project
      const delRes = await request(app)
        .delete(`/api/v1/projects/${projectId}`)
        .set("Cookie", aliceCookie);
      expect(delRes.statusCode).toBe(204);
    });

    test("File upload rejects spoofed non-image binary (magic-byte check)", async () => {
      const { cookie } = await registerUser({
        username: "uploader",
        email: "uploader@example.com",
      });
      const fakePng = Buffer.from("<script>alert('xss')</script>not a real png file");
      const res = await request(app)
        .post("/api/v1/projects/upload-image")
        .set("Cookie", cookie)
        .attach("image", fakePng, { filename: "evil.png", contentType: "image/png" });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toMatch(/Invalid image file/i);
    });
  });
});
