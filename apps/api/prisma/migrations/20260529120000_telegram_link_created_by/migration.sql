-- AlterTable
ALTER TABLE "TelegramLinkToken" ADD COLUMN "createdByUserId" TEXT;

-- Backfill is not possible for existing rows without a user; delete stale tokens if any.
DELETE FROM "TelegramLinkToken" WHERE "createdByUserId" IS NULL;

ALTER TABLE "TelegramLinkToken" ALTER COLUMN "createdByUserId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "TelegramLinkToken" ADD CONSTRAINT "TelegramLinkToken_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "TelegramLinkToken_createdByUserId_usedAt_idx" ON "TelegramLinkToken"("createdByUserId", "usedAt");
