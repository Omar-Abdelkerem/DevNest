import "dotenv/config";

const DEFAULT_CORS_ORIGINS = [
  "http://localhost:5173",
  "https://devnest-web-xi.vercel.app",
];

export function getAllowedOrigins() {
  const raw = process.env.CORS_ORIGINS;
  if (!raw || !raw.trim()) {
    return DEFAULT_CORS_ORIGINS;
  }
  return raw
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

const WEAK_SECRET_PATTERNS = [
  /^changeme$/i,
  /^secret$/i,
  /^password$/i,
  /^test$/i,
  /^devnest$/i,
  /^123456/,
];

export function validateProductionEnv() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const errors = [];

  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL is required in production.");
  }

  const origins = getAllowedOrigins();
  if (origins.includes("*")) {
    errors.push("CORS_ORIGINS must not contain a wildcard '*' in production.");
  }

  if (process.env.CLOUDINARY_API_SECRET) {
    const secret = process.env.CLOUDINARY_API_SECRET.trim();
    if (
      secret.length < 12 ||
      WEAK_SECRET_PATTERNS.some((re) => re.test(secret))
    ) {
      errors.push("CLOUDINARY_API_SECRET appears to be a weak or placeholder value.");
    }
  }

  if (errors.length > 0) {
    throw new Error(`Insecure production configuration:\n- ${errors.join("\n- ")}`);
  }
}
