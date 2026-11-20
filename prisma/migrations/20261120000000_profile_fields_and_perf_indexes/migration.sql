-- AlterTable: Add profile sidebar fields to User
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "location" TEXT,
  ADD COLUMN IF NOT EXISTS "age" INTEGER,
  ADD COLUMN IF NOT EXISTS "role" TEXT,
  ADD COLUMN IF NOT EXISTS "company" TEXT,
  ADD COLUMN IF NOT EXISTS "availableForWork" BOOLEAN NOT NULL DEFAULT false;

-- DropForeignKey & Recreate with ON DELETE CASCADE on Skill
ALTER TABLE "Skill" DROP CONSTRAINT IF EXISTS "Skill_userId_fkey";
ALTER TABLE "Skill"
  ADD CONSTRAINT "Skill_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex: Performance indexes matching real WHERE / ORDER BY / JOIN patterns
CREATE INDEX IF NOT EXISTS "User_isPublic_idx" ON "User"("isPublic");
CREATE INDEX IF NOT EXISTS "Project_isPublic_createdAt_idx" ON "Project"("isPublic", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Project_userId_isPublic_createdAt_idx" ON "Project"("userId", "isPublic", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Comment_projectId_createdAt_idx" ON "Comment"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "ProfileFeedback_recipientId_createdAt_idx" ON "ProfileFeedback"("recipientId", "createdAt" DESC);
