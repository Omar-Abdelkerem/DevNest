import redisClient from "../config/redis.client.js";
import "dotenv/config";
import crypto from "crypto";

export const SESSION_TTL_SECONDS =
  parseInt(process.env.SESSION_LIFETIME) || 3600; // Default to 1 hour if not set

export const createSession = async (userId) => {
  const sessionId = crypto.randomUUID();
  const sessionData = {
    userId,
    createdAt: new Date().toISOString(),
  };
  await redisClient.set(`session:${sessionId}`, JSON.stringify(sessionData), {
    EX: SESSION_TTL_SECONDS,
  });
  return sessionId;
};

export const getSession = async (sessionId) => {
  const raw = await redisClient.get(`session:${sessionId}`);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw);
};

export const deleteSession = async (sessionId) => {
  await redisClient.del(`session:${sessionId}`);
};
