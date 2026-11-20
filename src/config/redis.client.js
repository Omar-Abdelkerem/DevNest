import { createClient } from "redis";

const isTest = process.env.NODE_ENV === "test";
const redisUrl = process.env.REDIS_URL;

let redisReady = false;
let hasLoggedOffline = false;

const client = createClient({
  url: redisUrl || "redis://127.0.0.1:6379",
  socket: {
    connectTimeout: 2000,
    reconnectStrategy: (retries) => {
      if (isTest || retries > 5) {
        return false; // Stop reconnecting in test/offline mode; fallback kicks in
      }
      return Math.min(retries * 250, 2000);
    },
  },
});

client.on("ready", () => {
  redisReady = true;
  hasLoggedOffline = false;
  if (!isTest) {
    console.log("Connected to Redis");
  }
});

client.on("end", () => {
  redisReady = false;
});

client.on("error", (err) => {
  redisReady = false;
  if (!isTest && !hasLoggedOffline) {
    hasLoggedOffline = true;
    console.warn("Redis unavailable; falling back to in-memory store:", err.message);
  }
});

if (!isTest && redisUrl) {
  client.connect().catch(() => {
    redisReady = false;
  });
}

export const isRedisReady = () => redisReady && client.isReady;

export default client;
