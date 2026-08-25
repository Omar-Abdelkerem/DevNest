import { createClient } from "redis";

const client = createClient({
  url: process.env.REDIS_URL,
  socket: {
    // This tells Node.js not to drop the connection over certificate mismatch
    rejectUnauthorized: false,
    // This sends a tiny ping in the background to keep the Upstash connection alive
    keepAlive: 300,
  },
});

client.on("connect", () => {
  console.log("Connected to Redis");
});

client.on("error", (err) => {
  console.error("Redis Client Error", err);
});

client.connect().catch((err) => {
  console.error("Failed to connect to Redis on startup:", err);
});

export default client;
