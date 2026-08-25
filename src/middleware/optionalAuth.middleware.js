// middleware/optionalAuth.middleware.js
import { getSession } from "../utils/session.util.js";

const optionalAuthMiddleware = async (req, res, next) => {
  const sessionId = req.cookies.sessionId;

  if (sessionId) {
    const sessionData = await getSession(sessionId);
    if (sessionData) {
      req.user = sessionData; // logged in — req.user exists, same shape as before
    }
  }

  // No sessionId, or an invalid/expired one — req.user simply stays undefined.
  // Unlike authMiddleware, we never throw here. Everyone gets through.
  next();
};

export default optionalAuthMiddleware;
