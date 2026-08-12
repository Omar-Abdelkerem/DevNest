import jwt from "jsonwebtoken";
import "dotenv/config";
import { unauthenticatedError } from "../errors/index.js";

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new unauthenticatedError("Authorization header missing or malformed");
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    throw new unauthenticatedError("Invalid or expired token");
  }
};

export default authMiddleware;
