import { StatusCodes } from "http-status-codes";
import { getAllowedOrigins } from "../config/env.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Explicit CSRF defense-in-depth for cookie-authenticated state-changing requests.
 * Rejects any cross-origin POST/PUT/PATCH/DELETE whose Origin or Referer is not in
 * the exact CORS allowlist.
 */
const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (!origin && !referer) {
    // Non-browser clients (curl, server-to-server, Supertest) omit Origin/Referer.
    // Browsers always attach Origin (and/or Referer) on cross-site state-changing requests.
    return next();
  }

  const allowedOrigins = new Set(getAllowedOrigins());

  if (origin) {
    const normalizedOrigin = origin.replace(/\/$/, "");
    if (!allowedOrigins.has(normalizedOrigin)) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        error: { message: "Cross-site request rejected." },
      });
    }
    return next();
  }

  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (!allowedOrigins.has(refOrigin)) {
        return res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          error: { message: "Cross-site request rejected." },
        });
      }
    } catch {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        error: { message: "Invalid Referer header." },
      });
    }
  }

  return next();
};

export default csrfProtection;
