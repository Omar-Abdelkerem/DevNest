import express from "express";
import helmt from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import notFoundMiddleware from "./middleware/not-found.middleware.js";
import "dotenv/config";
import errorHandlerMiddleware from "./middleware/error-handler.middleware.js";
import redisClient from "./config/redis.client.js";
import { globalLimiter } from "./config/rateLimiter.js";
const app = express();
app.use(cookieParser());
//routes import
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import projectsRoutes from "./routes/projects.routes.js";
import skillsRoutes from "./routes/skills.routes.js";
import commentsRoutes from "./routes/comments.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js";
//middleware
app.use(helmt());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://devnest-web-xi.vercel.app"],
    credentials: true, // allows cookies to be sent/received
  }),
);
app.use(express.json());
app.use(globalLimiter);

//routes
app.get("/", (req, res) => {
  res.send("Welcome to the API");
});
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/projects", projectsRoutes);
app.use("/api/v1/skills", skillsRoutes);
app.use("/api/v1/comments", commentsRoutes);
app.use("/api/v1/feedback", feedbackRoutes);
//error handling
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);
export default app;
