import multer from "multer";
import cloudinary from "../config/cloudinary.client.js";
import { badRequestError } from "../errors/index.js";

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Inspect actual magic bytes (file signature) rather than trusting the
 * client-supplied Content-Type header or file extension.
 */
export function detectImageMimeFromBytes(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  // GIF: "GIF87a" or "GIF89a"
  const header6 = buffer.subarray(0, 6).toString("ascii");
  if (header6 === "GIF87a" || header6 === "GIF89a") {
    return "image/gif";
  }

  return null;
}

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: 1,
  },
});

export function uploadBufferToCloudinary(buffer, { folder, transformation }) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
        transformation,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      },
    );
    stream.end(buffer);
  });
}

function createValidatedImageUpload({ fieldName, folder, transformation }) {
  const singleUpload = memoryUpload.single(fieldName);

  return (req, res, next) => {
    singleUpload(req, res, async (err) => {
      if (err) {
        return next(err);
      }
      if (!req.file) {
        return next(new badRequestError("No image file was uploaded."));
      }

      const detectedMime = detectImageMimeFromBytes(req.file.buffer);
      if (!detectedMime) {
        return next(
          new badRequestError(
            "Invalid image file. Only JPEG, PNG, WebP, and GIF images are allowed.",
          ),
        );
      }

      try {
        const result = await uploadBufferToCloudinary(req.file.buffer, {
          folder,
          transformation,
        });
        req.file.path = result.secure_url;
        req.file.detectedMime = detectedMime;
        return next();
      } catch (uploadErr) {
        return next(uploadErr);
      }
    });
  };
}

export const uploadAvatar = createValidatedImageUpload({
  fieldName: "avatar",
  folder: "devnest-avatars",
  transformation: [{ width: 400, height: 400, crop: "fill", quality: "auto", fetch_format: "auto" }],
});

export const uploadProjectImage = createValidatedImageUpload({
  fieldName: "image",
  folder: "devnest-projects",
  transformation: [{ width: 1200, height: 675, crop: "limit", quality: "auto", fetch_format: "auto" }],
});

export default uploadAvatar;
