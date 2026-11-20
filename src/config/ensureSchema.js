import prisma from "./prisma.client.js";

/**
 * Idempotently ensures new profile columns, project ordering columns, and performance indexes exist on startup.
 * Safe whether the database was initialized with `prisma migrate deploy` or `prisma db push`.
 */
export async function ensureSchema() {
  if (process.env.NODE_ENV === "test") return;

  const statements = [
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "location" TEXT`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "age" INTEGER`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "company" TEXT`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "headline" TEXT`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "education" TEXT`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "yearsOfExperience" INTEGER`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "workPreferences" TEXT`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "whatsapp" TEXT`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resumeUrl" TEXT`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ctaMessage" TEXT`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "availableForWork" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0`,
    `CREATE INDEX IF NOT EXISTS "User_isPublic_idx" ON "User"("isPublic")`,
    `CREATE INDEX IF NOT EXISTS "Project_isPublic_createdAt_idx" ON "Project"("isPublic", "createdAt" DESC)`,
    `CREATE INDEX IF NOT EXISTS "Project_userId_isPublic_createdAt_idx" ON "Project"("userId", "isPublic", "createdAt" DESC)`,
    `CREATE INDEX IF NOT EXISTS "Project_userId_isPinned_sortOrder_idx" ON "Project"("userId", "isPinned" DESC, "sortOrder" ASC)`,
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
