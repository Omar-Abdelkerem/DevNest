import { beforeEach, describe, expect, test } from "@jest/globals";
import request from "supertest";
import {
  OWNER_ID,
  PRIVATE_USER_ID,
  STRANGER_ID,
  createAuthHeaders,
  createPrismaMock,
  loadAppWithMocks,
  resetPrismaMock,
} from "./test-helpers.js";

const prismaMock = createPrismaMock();
const { app, hashPasswordMock } = await loadAppWithMocks({
  prismaMock,
  mockPasswordUtils: true,
});

beforeEach(() => {
  resetPrismaMock(prismaMock);
  hashPasswordMock.mockReset();
});

describe("user routes", () => {
  test("GET /me returns the authenticated user", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: OWNER_ID,
      username: "alice",
      bio: "bio",
      avatarUrl: null,
      links: null,
      isPublic: false,
      createdAt: new Date("2026-08-12T00:00:00.000Z"),
    });

    const response = await request(app)
      .get("/api/v1/user/me")
      .set(createAuthHeaders(OWNER_ID));

    expect(response.statusCode).toBe(200);
    expect(response.body.user).toMatchObject({
      id: OWNER_ID,
      username: "alice",
      isPublic: false,
    });
  });

  test("GET /:id blocks strangers from a private profile", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: PRIVATE_USER_ID,
      username: "private-user",
      bio: null,
      avatarUrl: null,
      links: null,
      isPublic: false,
      createdAt: new Date("2026-08-12T00:00:00.000Z"),
    });

    const response = await request(app)
      .get(`/api/v1/user/${PRIVATE_USER_ID}`)
      .set(createAuthHeaders(STRANGER_ID));

    expect(response.statusCode).toBe(403);
    expect(response.body.error.message).toBe("This profile is private.");
  });

  test("PATCH /me hashes a new password before updating the current user", async () => {
    hashPasswordMock.mockResolvedValue("hashed-new-password");
    prismaMock.user.update.mockResolvedValue({
      id: OWNER_ID,
      username: "alice-updated",
      email: "alice@example.com",
      bio: "new bio",
      avatarUrl: null,
      links: null,
      isPublic: true,
      createdAt: new Date("2026-08-12T00:00:00.000Z"),
    });

    const response = await request(app)
      .patch("/api/v1/user/me")
      .set(createAuthHeaders(OWNER_ID))
      .send({
        username: "alice-updated",
        password: "new-secret123",
      });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.user.update.mock.calls[0][0]).toMatchObject({
      where: { id: OWNER_ID },
      data: {
        username: "alice-updated",
        passwordHash: "hashed-new-password",
      },
    });
  });
});
