import { jest, describe, expect, test, beforeAll, afterAll, beforeEach } from "@jest/globals";
import { createInMemoryPrisma } from "../helpers/inMemoryPrisma.js";

const prismaMock = createInMemoryPrisma();

await jest.unstable_mockModule("../../src/config/prisma.client.js", () => ({
  default: prismaMock,
}));

const { clearMemorySessions } = await import("../../src/utils/session.util.js");
const { clearMemoryCache } = await import("../../src/utils/cache.util.js");
const { default: app } = await import("../../src/app.js");

let server;
let baseUrl;

async function http(path, { method = "GET", cookie, body, headers = {} } = {}) {
  const reqHeaders = { ...headers };
  if (cookie) reqHeaders.Cookie = cookie;
  if (body !== undefined) reqHeaders["Content-Type"] = "application/json";

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: reqHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const setCookie = res.headers.get("set-cookie");
  const sessionCookie = setCookie ? setCookie.split(";")[0] : null;
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json, sessionCookie, headers: res.headers };
}

describe("End-to-End User Journeys (Real HTTP Server)", () => {
  beforeAll(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    prismaMock.reset();
    clearMemorySessions();
    clearMemoryCache();
  });

  test("Journey 1 & 2: Developer onboarding -> Sidebar profile -> Project w/ photo & links -> Peer discovery, star, comment & feedback", async () => {
    // 1. Omar registers
    const regOmar = await http("/api/v1/auth/register", {
      method: "POST",
      body: { username: "omar_dev", email: "omar@devnest.dev", password: "Password123" },
    });
    expect(regOmar.status).toBe(201);
    const omarCookie = regOmar.sessionCookie;

    // 2. Omar fills out sidebar info (location, age, role, company, availableForWork)
    const patchProfile = await http("/api/v1/user/me", {
      method: "PATCH",
      cookie: omarCookie,
      body: {
        bio: "Building interactive developer tools.",
        location: "Alexandria, Egypt",
        age: 21,
        role: "Full-Stack Engineer",
        company: "DevNest",
        availableForWork: true,
        links: ["https://github.com/Omar-Abdelkerem"],
      },
    });
    expect(patchProfile.status).toBe(200);
    expect(patchProfile.json.user.location).toBe("Alexandria, Egypt");
    expect(patchProfile.json.user.age).toBe(21);

    // 3. Omar publishes a project with cover photo & optional links
    const createProject = await http("/api/v1/projects", {
      method: "POST",
      cookie: omarCookie,
      body: {
        title: "Pulse Analytics",
        description: "Real-time telemetry dashboard",
        projectimgUrl: "https://res.cloudinary.com/demo/image/upload/v1/pulse.png",
        links: [{ name: "Live Demo", url: "https://pulse.example.com" }],
        languages: ["TypeScript", "Go"],
        isPublic: true,
      },
    });
    expect(createProject.status).toBe(201);
    const projectId = createProject.json.id;

    // 4. Sara registers and discovers Omar's project via Explore search
    const regSara = await http("/api/v1/auth/register", {
      method: "POST",
      body: { username: "sara_eng", email: "sara@devnest.dev", password: "Password123" },
    });
    expect(regSara.status).toBe(201);
    const saraCookie = regSara.sessionCookie;

    const searchRes = await http("/api/v1/projects?search=Pulse", { cookie: saraCookie });
    expect(searchRes.status).toBe(200);
    expect(searchRes.json).toHaveLength(1);
    expect(searchRes.json[0].id).toBe(projectId);

    // 5. Sara stars the project, comments, and leaves profile feedback
    expect((await http(`/api/v1/projects/${projectId}/star`, { method: "POST", cookie: saraCookie })).status).toBe(201);
    expect(
      (
        await http("/api/v1/comments", {
          method: "POST",
          cookie: saraCookie,
          body: { projectId, content: "Super clean UI!" },
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await http("/api/v1/feedback", {
          method: "POST",
          cookie: saraCookie,
          body: { recipientId: regOmar.json.user.id, content: "Impressive engineering portfolio!" },
        })
      ).status,
    ).toBe(201);

    // 6. Verify Omar's public profile & project reflect all interactions
    const details = await http(`/api/v1/projects/${projectId}`);
    expect(details.status).toBe(200);
    expect(details.json.stars).toBe(1);
    expect(details.json.links).toEqual([{ name: "Live Demo", url: "https://pulse.example.com" }]);

    const feedbackList = await http("/api/v1/feedback/user/omar_dev");
    expect(feedbackList.status).toBe(200);
    expect(feedbackList.json).toHaveLength(1);
    expect(feedbackList.json[0].content).toBe("Impressive engineering portfolio!");

    // 7. Omar edits & deletes the project -> disappears from public Explore feed immediately
    expect(
      (
        await http(`/api/v1/projects/${projectId}`, {
          method: "PATCH",
          cookie: omarCookie,
          body: { title: "Pulse Analytics v2" },
        })
      ).json.title,
    ).toBe("Pulse Analytics v2");

    expect((await http(`/api/v1/projects/${projectId}`, { method: "DELETE", cookie: omarCookie })).status).toBe(204);
    const feedAfterDelete = await http("/api/v1/projects");
    expect(feedAfterDelete.status).toBe(200);
    expect(feedAfterDelete.json).toHaveLength(0);
  });
});
