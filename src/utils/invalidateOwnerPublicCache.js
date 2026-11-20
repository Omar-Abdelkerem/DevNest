import { CACHE_KEYS, deleteCache } from "./cache.util.js";

const invalidateOwnerPublicCache = async (resource, username, extraKeys = []) => {
  const keys = [
    `${resource}:all:v2`,
    username ? `${resource}:username:${username}:owner:v2` : null,
    username ? `${resource}:username:${username}:public:v2` : null,
    resource === "projects" ? CACHE_KEYS.projectsFeatured : null,
    ...extraKeys,
  ];
  await deleteCache(keys);
};

export default invalidateOwnerPublicCache;
