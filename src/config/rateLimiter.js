import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redisClient, { isRedisReady } from "./redis.client.js";

const isTest = process.env.NODE_ENV === "test";

function createStore(prefix) {
  if (isTest || !isRedisReady()) {
    return undefined; // express-rate-limit uses built-in MemoryStore
  }
  return new RedisStore({
    prefix,
    sendCommand: (...args) => redisClient.sendCommand(args),
  });
}

export const globalLimiter = rateLimit({
  store: createStore("rl:global:"),
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: isTest ? 10000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: "Too many requests. Please slow down and try again shortly." },
  },
});

export const authLimiter = rateLimit({
  store: createStore("rl:auth:"),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: "Too many authentication attempts. Please try again in 15 minutes." },
  },
});

export const writeLimiter = rateLimit({
  store: createStore("rl:write:"),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: "Too many submissions. Please wait a moment before trying again." },
  },
});
