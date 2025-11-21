ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "isBlocked" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "blockedAt" TIMESTAMP(3);

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "blockedReason" TEXT;

UPDATE "User"
SET "isBlocked" = true
WHERE LOWER("status") = 'blocked';
