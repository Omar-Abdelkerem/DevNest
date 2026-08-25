// Configures multer to accept a single image file and upload it directly
// to Cloudinary (via the multer-storage-cloudinary adapter) instead of
// saving it to this server's local disk first.
//
// Why not save to local disk?
//   Deployed platforms (Railway, Render, etc.) typically treat the app's
//   filesystem as temporary — anything written to disk can be wiped on
//   restart/redeploy. Cloudinary stores the file permanently and gives
//   back a stable URL, which is what we actually store in the database.

import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.client.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "devnest-avatars", // keeps uploads organized in your Cloudinary dashboard
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    // Cloudinary can resize on upload — keeps avatar files reasonably small
    transformation: [{ width: 400, height: 400, crop: "fill" }],
  },
});

// .single("avatar") expects the frontend to send the file under the
// field name "avatar" in a multipart/form-data request. This name must
// match exactly what the frontend's FormData uses later.
const uploadAvatar = multer({ storage }).single("avatar");

export default uploadAvatar;
