import redisClient from "../config/redis.client.js";
import "dotenv/config";
import { unauthenticatedError } from "../errors/index.js";
import { getSession } from "../utils/session.util.js";

const authMiddleware = async (req, res, next) => {
  const sessionId = req.cookies.sessionId;
  if (!sessionId) {
    throw new unauthenticatedError("Session ID missing");
  }
  const sessionData = await getSession(sessionId);
  if (!sessionData) {
    throw new unauthenticatedError("Invalid or expired session");
  }
  req.user = sessionData;
  next();
};

export default authMiddleware;
