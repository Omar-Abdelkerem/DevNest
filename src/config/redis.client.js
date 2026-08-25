import { createClient } from "redis";

const client = createClient({
  url: process.env.REDIS_URL,
  pingInterval: 120000, // Pings Upstash every 2 minutes to stop it from hanging up
  socket: {
    tls: true, // Explicitly forces TLS for Upstash
    rejectUnauthorized: false,
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
