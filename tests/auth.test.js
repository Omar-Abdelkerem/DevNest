import { beforeEach, describe, expect, test } from "@jest/globals";
import { Prisma } from "@prisma/client";
import request from "supertest";
import {
  OWNER_ID,
  STRANGER_ID,
  createPrismaMock,
  loadAppWithMocks,
  resetPrismaMock,
} from "./test-helpers.js";

const prismaMock = createPrismaMock();
const { app, hashPasswordMock, comparePasswordMock, createJWTMock } =
  await loadAppWithMocks({
    prismaMock,
    mockPasswordUtils: true,
  });

beforeEach(() => {
  resetPrismaMock(prismaMock);
  hashPasswordMock.mockReset();
  comparePasswordMock.mockReset();
  createJWTMock.mockReset();
});

const buildRegisterPayload = (overrides = {}) => ({
  username: "alice",
  email: "alice@example.com",
  password: "secret123",
  ...overrides,
});

const buildLoginPayload = (overrides = {}) => ({
  email: "alice@example.com",
  password: "secret123",
  ...overrides,
});

describe("auth routes", () => {
  test("register creates a user with a hashed password and returns a token", async () => {
    hashPasswordMock.mockResolvedValue("hashed-password");
    createJWTMock.mockReturnValue("jwt-token");
    prismaMock.user.create.mockResolvedValue({
      id: OWNER_ID,
      username: "alice",
      email: "alice@example.com",
      bio: null,
      avatarUrl: null,
      isPublic: true,
      createdAt: new Date("2026-08-12T00:00:00.000Z"),
    });

    const response = await request(app).post("/api/v1/auth/register").send({
      username: "alice",
      email: "alice@example.com",
      password: "secret123",
      userId: STRANGER_ID,
    });

    expect(response.statusCode).toBe(201);
    expect(response.body).toMatchObject({
      user: {
        id: OWNER_ID,
        username: "alice",
        email: "alice@example.com",
      },
      token: "jwt-token",
    });
    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.create.mock.calls[0][0].data).toMatchObject({
      username: "alice",
      email: "alice@example.com",
      passwordHash: "hashed-password",
    });
    expect(prismaMock.user.create.mock.calls[0][0].data.userId).toBeUndefined();
  });

  test.each([
    ["missing username", { email: "alice@example.com", password: "secret123" }],
    ["missing email", { username: "alice", password: "secret123" }],
    ["invalid email", { email: "not-an-email" }],
    ["missing password", { username: "alice", email: "alice@example.com" }],
    ["short password", { password: "123" }],
  ])("register rejects %s", async (_label, payload) => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(payload);

    expect(response.statusCode).toBe(500);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(hashPasswordMock).not.toHaveBeenCalled();
  });

  test("register returns conflict when the user already exists", async () => {
    hashPasswordMock.mockResolvedValue("hashed-password");
    prismaMock.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed on the fields: (`email`)",
        {
          code: "P2002",
          clientVersion: "7.9.1",
          meta: { target: ["email"] },
        },
      ),
    );

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(buildRegisterPayload());

    expect(response.statusCode).toBe(409);
    expect(response.body.error.message).toBe("email already exists.");
  });

  test("login validates the password and returns a token", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: OWNER_ID,
      username: "alice",
      email: "alice@example.com",
      passwordHash: "hashed-password",
    });
    comparePasswordMock.mockResolvedValue(true);
    createJWTMock.mockReturnValue("jwt-token");

    const response = await request(app).post("/api/v1/auth/login").send({
      email: "alice@example.com",
      password: "secret123",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      user: { username: "alice" },
      token: "jwt-token",
    });
  });

  test("login rejects a missing email", async () => {
    const response = await request(app).post("/api/v1/auth/login").send({
      password: "secret123",
    });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: undefined },
    });
    expect(response.statusCode).toBe(401);
    expect(response.body.error.message).toBe("Invalid credentials");
  });

  test("login rejects a missing password when the email exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: OWNER_ID,
      username: "alice",
      email: "alice@example.com",
      passwordHash: "hashed-password",
    });
    comparePasswordMock.mockResolvedValue(false);

    const response = await request(app).post("/api/v1/auth/login").send({
      email: "alice@example.com",
    });

    expect(comparePasswordMock).toHaveBeenCalledWith(
      undefined,
      "hashed-password",
    );
    expect(response.statusCode).toBe(401);
    expect(response.body.error.message).toBe("Invalid credentials");
  });

  test.each([
    ["wrong email", buildLoginPayload({ email: "missing@example.com" })],
    ["wrong password", buildLoginPayload()],
  ])("login rejects %s", async (_label, payload) => {
    prismaMock.user.findUnique.mockResolvedValue(
      payload.email === "missing@example.com"
        ? null
        : {
            id: OWNER_ID,
            username: "alice",
            email: "alice@example.com",
            passwordHash: "hashed-password",
          },
    );
    comparePasswordMock.mockResolvedValue(false);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send(
        payload.email === "missing@example.com"
          ? payload
          : { email: "alice@example.com", password: "wrong-password" },
      );

    expect(response.statusCode).toBe(401);
    expect(response.body.error.message).toBe("Invalid credentials");
  });
});
