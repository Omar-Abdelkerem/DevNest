import { deleteCache } from "./cache.util.js";

const invalidateOwnerPublicCache = async (resource, username) => {
  await deleteCache(
    `${resource}:all`,
    `${resource}:all:v2`,
    `${resource}:username:${username}:owner`,
    `${resource}:username:${username}:public`,
    `${resource}:username:${username}:owner:v2`,
    `${resource}:username:${username}:public:v2`,
  );
};

export default invalidateOwnerPublicCache;
