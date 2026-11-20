import { createClient } from "redis";
import "dotenv/config";

const isTest = process.env.NODE_ENV === "test";
const redisUrl = process.env.REDIS_URL;

let redisReady = false;

const client = createClient(
  isTest
    ? {
        url: redisUrl || "redis://127.0.0.1:6379",
        socket: { connectTimeout: 500, reconnectStrategy: () => false },
      }
    : {
        url: redisUrl,
      },
);

client.on("ready", () => {
  redisReady = true;
  if (!isTest) {
    console.log("Connected to Redis");
  }
});

client.on("connect", () => {
  redisReady = true;
});

client.on("end", () => {
  redisReady = false;
});

client.on("error", (err) => {
  redisReady = false;
  if (!isTest) {
    console.error("Redis Client Error", err.message);
  }
});

if (!isTest && redisUrl) {
  client.connect().catch((err) => {
    redisReady = false;
    console.error("Failed to connect to Redis on startup:", err.message);
  });
}

export const isRedisReady = () => Boolean(redisReady && (client.isReady || client.isOpen));

export default client;
