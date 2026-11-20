import crypto from "crypto";
import "dotenv/config";
import redisClient, { isRedisReady } from "../config/redis.client.js";

export const SESSION_TTL_SECONDS =
  parseInt(process.env.SESSION_LIFETIME, 10) || 3600; // Default 1 hour

const memorySessions = new Map();
const memoryUserSessions = new Map();

const userSessionsKey = (userId) => `user:sessions:${userId}`;
const sessionKey = (sessionId) => `session:${sessionId}`;

export const createSession = async (userId) => {
  const sessionId = crypto.randomUUID();
  const sessionData = {
    userId,
    createdAt: new Date().toISOString(),
  };

  if (isRedisReady()) {
    try {
      await Promise.all([
        redisClient.set(sessionKey(sessionId), JSON.stringify(sessionData), {
          EX: SESSION_TTL_SECONDS,
        }),
        redisClient.sAdd(userSessionsKey(userId), sessionId),
        redisClient.expire(userSessionsKey(userId), SESSION_TTL_SECONDS),
      ]);
      return sessionId;
    } catch {
      // Fall through to memory store
    }
  }

  memorySessions.set(sessionId, {
    data: sessionData,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  });
  if (!memoryUserSessions.has(userId)) {
    memoryUserSessions.set(userId, new Set());
  }
  memoryUserSessions.get(userId).add(sessionId);
  return sessionId;
};

export const getSession = async (sessionId) => {
  if (!sessionId || typeof sessionId !== "string") return null;

  if (isRedisReady()) {
    try {
      const raw = await redisClient.get(sessionKey(sessionId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      // Fall through to memory store
    }
  }

  const entry = memorySessions.get(sessionId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memorySessions.delete(sessionId);
    memoryUserSessions.get(entry.data.userId)?.delete(sessionId);
    return null;
  }
  return entry.data;
};

export const deleteSession = async (sessionId) => {
  if (!sessionId || typeof sessionId !== "string") return;

  if (isRedisReady()) {
    try {
      const existing = await redisClient.get(sessionKey(sessionId));
      await redisClient.del(sessionKey(sessionId));
      if (existing) {
        const parsed = JSON.parse(existing);
        if (parsed?.userId) {
          await redisClient.sRem(userSessionsKey(parsed.userId), sessionId);
        }
      }
      return;
    } catch {
      // Fall through to memory store
    }
  }

  const entry = memorySessions.get(sessionId);
  if (entry?.data?.userId) {
    memoryUserSessions.get(entry.data.userId)?.delete(sessionId);
  }
  memorySessions.delete(sessionId);
};

/**
 * Invalidate all active sessions for a user (e.g. on password change).
 * Optionally preserves `exceptSessionId` so the current browser stays logged in.
 */
export const invalidateAllUserSessions = async (userId, exceptSessionId = null) => {
  if (!userId) return;

  if (isRedisReady()) {
    try {
      const sessionIds = await redisClient.sMembers(userSessionsKey(userId));
      const toRevoke = sessionIds.filter((id) => id !== exceptSessionId);
      if (toRevoke.length > 0) {
        await Promise.all([
          redisClient.del(toRevoke.map(sessionKey)),
          redisClient.sRem(userSessionsKey(userId), toRevoke),
        ]);
      }
      return;
    } catch {
      // Fall through to memory store
    }
  }

  const set = memoryUserSessions.get(userId);
  if (!set) return;
  for (const id of [...set]) {
    if (id !== exceptSessionId) {
      memorySessions.delete(id);
      set.delete(id);
    }
  }
};

export const clearMemorySessions = () => {
  memorySessions.clear();
  memoryUserSessions.clear();
};
