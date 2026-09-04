import { deleteCache } from "./cache.util.js";

const invalidateOwnerPublicCache = async (resource, username) => {
  await deleteCache(
    // Versioned list caches (the only keys actually written today)
    `${resource}:all:v2`,
    `${resource}:username:${username}:owner:v2`,
    `${resource}:username:${username}:public:v2`,
    // Landing-page featured slice (projects only)
    resource === "projects" ? "projects:featured:v2" : null,
  );
};

export default invalidateOwnerPublicCache;
