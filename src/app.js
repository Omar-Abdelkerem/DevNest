import express from "express";
import helmt from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import notFoundMiddleware from "./middleware/not-found.middleware.js";
import "dotenv/config";
import errorHandlerMiddleware from "./middleware/error-handler.middleware.js";
const app = express();
//routes import
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import projectsRoutes from "./routes/projects.routes.js";
import skillsRoutes from "./routes/skills.routes.js";
import commentsRoutes from "./routes/comments.routes.js";
//middleware
app.use(helmt());
app.use(cors());
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  }),
);

//routes
app.get("/", (req, res) => {
  res.send("Welcome to the API");
});
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/projects", projectsRoutes);
app.use("/api/v1/skills", skillsRoutes);
app.use("/api/v1/comments", commentsRoutes);

//error handling
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);
export default app;
