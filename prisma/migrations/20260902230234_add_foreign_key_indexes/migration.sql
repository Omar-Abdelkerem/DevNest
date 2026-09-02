-- CreateIndex
CREATE INDEX "Comment_projectId_idx" ON "Comment"("projectId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE INDEX "ProfileFeedback_authorId_idx" ON "ProfileFeedback"("authorId");

-- CreateIndex
CREATE INDEX "ProfileFeedback_recipientId_idx" ON "ProfileFeedback"("recipientId");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "ProjectLanguages_languageId_idx" ON "ProjectLanguages"("languageId");

-- CreateIndex
CREATE INDEX "ProjectSkill_skillId_idx" ON "ProjectSkill"("skillId");

-- CreateIndex
CREATE INDEX "Skill_userId_idx" ON "Skill"("userId");

-- CreateIndex
CREATE INDEX "Star_projectId_idx" ON "Star"("projectId");
