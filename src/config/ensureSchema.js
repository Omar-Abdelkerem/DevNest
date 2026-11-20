import prisma from "./prisma.client.js";

/**
 * Idempotently ensures new profile columns and performance indexes exist on startup.
 * Safe whether the database was initialized with `prisma migrate deploy` or `prisma db push`.
 */
export async function ensureSchema() {
  if (process.env.NODE_ENV === "test") return;

  const statements = [
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "location" TEXT`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "age" INTEGER`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "company" TEXT`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "availableForWork" BOOLEAN NOT NULL DEFAULT false`,
    `CREATE INDEX IF NOT EXISTS "User_isPublic_idx" ON "User"("isPublic")`,
    `CREATE INDEX IF NOT EXISTS "Project_isPublic_createdAt_idx" ON "Project"("isPublic", "createdAt" DESC)`,
    `CREATE INDEX IF NOT EXISTS "Project_userId_isPublic_createdAt_idx" ON "Project"("userId", "isPublic", "createdAt" DESC)`,
    `CREATE INDEX IF NOT EXISTS "Comment_projectId_createdAt_idx" ON "Comment"("projectId", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS "ProfileFeedback_recipientId_createdAt_idx" ON "ProfileFeedback"("recipientId", "createdAt" DESC)`,
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (err) {
      console.warn("Schema check skipped statement:", err.message);
    }
  }
}
