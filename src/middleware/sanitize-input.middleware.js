import { StatusCodes } from "http-status-codes";

export function containsNulByte(value) {
  if (typeof value === "string") {
    return value.includes("\u0000");
  }
  if (Array.isArray(value)) {
    return value.some(containsNulByte);
  }
  if (value && typeof value === "object") {
    return Object.entries(value).some(
      ([k, v]) => containsNulByte(k) || containsNulByte(v),
    );
  }
  return false;
}

const sanitizeInputMiddleware = (req, res, next) => {
  if (
    containsNulByte(req.body) ||
    containsNulByte(req.query) ||
    containsNulByte(req.params)
  ) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: { message: "Invalid characters in request payload." },
    });
  }
  return next();
};

export default sanitizeInputMiddleware;
