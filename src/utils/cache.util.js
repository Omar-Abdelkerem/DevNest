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

export default getOrSetCache;
