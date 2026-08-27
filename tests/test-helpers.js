import { jest } from "@jest/globals";

export const OWNER_ID = "11111111-1111-4111-8111-111111111111";
export const STRANGER_ID = "22222222-2222-4222-8222-222222222222";
export const PRIVATE_USER_ID = "33333333-3333-4333-8333-333333333333";
export const PROJECT_ID = "44444444-4444-4444-8444-444444444444";
export const SKILL_ID = "55555555-5555-4555-8555-555555555555";
export const COMMENT_ID = "66666666-6666-4666-8666-666666666666";

export const createPrismaMock = () => ({
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  project: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  skill: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  comment: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  star: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
});

export const createAuthHeaders = (userId) => ({
  "x-user-id": userId,
});

export const resetPrismaMock = (prismaMock) => {
  for (const collection of Object.values(prismaMock)) {
    for (const method of Object.values(collection)) {
      method.mockReset();
    }
  }
};

export async function loadAppWithMocks({
  prismaMock,
  authUserId = OWNER_ID,
  mockPasswordUtils = false,
}) {
  const hashPasswordMock = jest.fn();
  const comparePasswordMock = jest.fn();
  const createJWTMock = jest.fn();

  await jest.unstable_mockModule("../src/config/prisma.client.js", () => ({
    default: prismaMock,
  }));

  await jest.unstable_mockModule("../src/config/rateLimiter.js", () => ({
    globalLimiter: (req, res, next) => next(),
    authLimiter: (req, res, next) => next(),
  }));

  await jest.unstable_mockModule("../src/config/redis.client.js", () => ({
    default: {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue("OK"),
      del: jest.fn().mockResolvedValue(1),
      sendCommand: jest.fn().mockResolvedValue(["OK", 1]),
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
    },
  }));

  await jest.unstable_mockModule("../src/middleware/auth.middleware.js", () => ({
    default: (req, res, next) => {
      req.user = {
        userId: req.headers["x-user-id"] ?? authUserId,
      };
      next();
    },
  }));

  await jest.unstable_mockModule(
    "../src/middleware/optionalAuth.middleware.js",
    () => ({
      default: (req, res, next) => {
        const userId = req.headers["x-user-id"];
        if (userId) {
          req.user = { userId };
        }
        next();
      },
    }),
  );

  if (mockPasswordUtils) {
    await jest.unstable_mockModule("../src/utils/password-hashing.util.js", () => ({
      hashPassword: hashPasswordMock,
      comparePassword: comparePasswordMock,
    }));

    await jest.unstable_mockModule("../src/utils/jwt.util.js", () => ({
      createJWT: createJWTMock,
    }));
  }

  const { default: app } = await import("../src/app.js");

  return {
    app,
    hashPasswordMock,
    comparePasswordMock,
    createJWTMock,
  };
}