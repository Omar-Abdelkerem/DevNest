import client, { isRedisReady } from "../config/redis.client.js";

/**
 * Shared canonical cache keys so all controllers read and invalidate
 * the exact same keys (prevents v1/v2 drift).
 */
export const CACHE_KEYS = {
  projectById: (id) => `project:id:${id}:v2`,
  projectsAll: "projects:all:v2",
  projectsFeatured: "projects:featured:v2",
  userProjects: (username, type) => `projects:username:${username}:${type}:v2`,
};

// Bounded in-memory fallback cache when Redis is offline
const memoryCache = new Map();
const MAX_MEMORY_ENTRIES = 500;

const getFromMemory = (key) => {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
};

const setInMemory = (key, value, ttlSeconds) => {
  if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

const getOrSetCache = async (key, ttlSeconds, fetchFunction) => {
  if (isRedisReady()) {
    try {
      const cachedData = await client.get(key);
      if (cachedData !== null) {
        return JSON.parse(cachedData);
      }
      const freshData = await fetchFunction();
      if (freshData !== null && freshData !== undefined) {
        await client.set(key, JSON.stringify(freshData), { EX: ttlSeconds });
      }
      return freshData;
    } catch {
      // Fall through to memory/direct fetch if Redis errors mid-request
    }
  }

  const memHit = getFromMemory(key);
  if (memHit !== null) {
    return memHit;
  }

  const freshData = await fetchFunction();
  if (freshData !== null && freshData !== undefined) {
    setInMemory(key, freshData, ttlSeconds);
  }
  return freshData;
};

/**
 * Delete one or more cache keys in a single Redis round-trip (and memory fallback).
 */
export const deleteCache = async (...keys) => {
  const flat = keys.flat().filter(Boolean);
  if (flat.length === 0) return;

  for (const key of flat) {
    memoryCache.delete(key);
  }

  if (isRedisReady()) {
    try {
      await client.del(flat);
    } catch {
      // Ignore transient Redis errors during invalidation
    }
  }
};

export const clearMemoryCache = () => {
  memoryCache.clear();
};

export default getOrSetCache;
