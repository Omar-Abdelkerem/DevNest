// Sets up the Cloudinary SDK using the three credentials from .env
// (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).
//
// This file's only job is to configure the SDK once and export it —
// same role as prisma.client.js and redis.client.js: one shared,
// already-configured client that other files import and reuse.

import { v2 as cloudinary } from "cloudinary";
import "dotenv/config";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
