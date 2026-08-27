import client from "../config/redis.client.js";

const getOrSetCache = async (key, ttlSeconds, fetchFunction) => {
  const cachedData = await client.get(key);
  if (cachedData) {
    console.log(`Cache hit for key: ${key}`);
    return JSON.parse(cachedData);
  }
  const freshData = await fetchFunction();
  await client.set(key, JSON.stringify(freshData), { EX: ttlSeconds });
  console.log(`Cache miss for key: ${key}. Data fetched and cached.`);
  return freshData;
};

/**
 * Delete one or more cache keys in a single Redis round-trip.
 * node-redis v4+ accepts an array to DEL — one RTT vs N serial calls.
 */
export const deleteCache = async (...keys) => {
  const flat = keys.flat().filter(Boolean);
  if (flat.length === 0) return;
  await client.del(flat);
  console.log(`Cache invalidated: ${flat.join(", ")}`);
};

export default getOrSetCache;
