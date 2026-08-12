import { beforeEach, describe, expect, test } from "@jest/globals";
import request from "supertest";
import {
  OWNER_ID,
  PRIVATE_USER_ID,
  SKILL_ID,
  STRANGER_ID,
  createAuthHeaders,
  createPrismaMock,
  loadAppWithMocks,
  resetPrismaMock,
} from "./test-helpers.js";

const prismaMock = createPrismaMock();
const { app } = await loadAppWithMocks({ prismaMock });

beforeEach(() => {
  resetPrismaMock(prismaMock);
});

describe("skill routes", () => {
  test("POST / creates a skill for the authenticated user", async () => {
    prismaMock.skill.create.mockResolvedValue({
      id: SKILL_ID,
      name: "JavaScript",
      level: "EXPERT",
      userId: OWNER_ID,
    });

    const response = await request(app)
      .post("/api/v1/skills")
      .set(createAuthHeaders(OWNER_ID))
      .send({
        name: "JavaScript",
        level: "EXPERT",
        userId: STRANGER_ID,
      });

    expect(response.statusCode).toBe(201);
    expect(prismaMock.skill.create.mock.calls[0][0].data).toMatchObject({
      name: "JavaScript",
      level: "EXPERT",
      userId: OWNER_ID,
    });
  });

  test("GET /:id allows the owner to open a private skill", async () => {
    prismaMock.skill.findUnique.mockResolvedValue({
      id: SKILL_ID,
      name: "JavaScript",
      level: "EXPERT",
      userId: OWNER_ID,
      user: { isPublic: false },
    });

    const response = await request(app)
      .get(`/api/v1/skills/${SKILL_ID}`)
      .set(createAuthHeaders(OWNER_ID));

    expect(response.statusCode).toBe(200);
    expect(response.body.id).toBe(SKILL_ID);
  });

  test("DELETE /:id rejects deletes from non-owners", async () => {
    prismaMock.skill.findUnique.mockResolvedValue({
      id: SKILL_ID,
      userId: OWNER_ID,
    });

    const response = await request(app)
      .delete(`/api/v1/skills/${SKILL_ID}`)
      .set(createAuthHeaders(STRANGER_ID));

    expect(response.statusCode).toBe(403);
    expect(prismaMock.skill.delete).not.toHaveBeenCalled();
  });

  test("GET /:username/skills blocks strangers from a private profile", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: PRIVATE_USER_ID,
      username: "private-user",
      isPublic: false,
    });

    const response = await request(app)
      .get(`/api/v1/user/private-user/skills`)
      .set(createAuthHeaders(STRANGER_ID));

    expect(response.statusCode).toBe(403);
  });
});