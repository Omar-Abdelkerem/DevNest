import client from "../config/redis.client.js";
import prisma from "../config/prisma.client.js";

const invalidateOwnerPublicCache = async (resource, username) => {
  await client.del(`${resource}:username:${username}:owner`);
  await client.del(`${resource}:username:${username}:public`);
};

export default invalidateOwnerPublicCache;
