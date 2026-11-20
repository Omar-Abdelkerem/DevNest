import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";

import { getAllowedOrigins } from "./config/env.js";
import { globalLimiter } from "./config/rateLimiter.js";
import csrfProtection from "./middleware/csrf.middleware.js";
import sanitizeInputMiddleware from "./middleware/sanitize-input.middleware.js";
import notFoundMiddleware from "./middleware/not-found.middleware.js";
import errorHandlerMiddleware from "./middleware/error-handler.middleware.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import projectsRoutes from "./routes/projects.routes.js";
import skillsRoutes from "./routes/skills.routes.js";
import commentsRoutes from "./routes/comments.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js";

const app = express();

// Trust first reverse proxy (Render, Railway, Nginx) so req.ip and secure cookies work
app.set("trust proxy", 1);

// Security headers — strict API-only CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "no-referrer" },
  }),
);

// HTTP compression (gzip / deflate) for JSON responses
app.use(compression());

// Exact-origin CORS allowlist (never wildcard with credentials)
const allowedOrigins = getAllowedOrigins();
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // non-browser / same-origin
      const normalized = origin.replace(/\/$/, "");
      if (allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: "256kb" }));
app.use(sanitizeInputMiddleware);
app.use(csrfProtection);
app.use(globalLimiter);

// Health & root endpoints
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "DevNest API" });
});

app.get("/health", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ status: "ok", uptime: Math.round(process.uptime()) });
});

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/projects", projectsRoutes);
app.use("/api/v1/skills", skillsRoutes);
app.use("/api/v1/comments", commentsRoutes);
app.use("/api/v1/feedback", feedbackRoutes);

// Error handling
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;
