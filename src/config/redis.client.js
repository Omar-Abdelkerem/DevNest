import { createClient } from "redis";

const client = createClient({
  url: process.env.REDIS_URL,
});

client.on("connect", () => {
  console.log("Connected to Redis");
});

client.on("error", (err) => {
  console.error("Redis Client Error", err);
});

// THIS IS THE FIX: Non-blocking connection
client.connect().catch((err) => {
  console.error("Failed to connect to Redis on startup:", err);
});

export default client;
