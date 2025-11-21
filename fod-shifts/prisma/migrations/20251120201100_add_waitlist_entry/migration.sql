DO $$
BEGIN
  CREATE TYPE "SignupStatus" AS ENUM ('CONFIRMED', 'WAITLISTED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Signup"
  ADD COLUMN IF NOT EXISTS "attendanceNote" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "waitlistedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "status" "SignupStatus" NOT NULL DEFAULT 'CONFIRMED',
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "workedMinutes" INTEGER NOT NULL DEFAULT 0;

UPDATE "Signup"
SET "updatedAt" = NOW()
WHERE "updatedAt" IS NULL;

ALTER TABLE "Signup"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT,
  ALTER COLUMN "workedMinutes" DROP DEFAULT;

CREATE TABLE IF NOT EXISTS "WaitlistEntry" (
  "id" SERIAL NOT NULL,
  "shiftId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WaitlistEntry_shiftId_userId_key" ON "WaitlistEntry"("shiftId", "userId");
CREATE INDEX IF NOT EXISTS "WaitlistEntry_shiftId_createdAt_idx" ON "WaitlistEntry"("shiftId", "createdAt");

INSERT INTO "WaitlistEntry" ("shiftId", "userId", "comment", "createdAt")
SELECT "shiftId", "userId", "comment", COALESCE("waitlistedAt", "createdAt")
FROM "Signup"
WHERE "status" = 'WAITLISTED'
ON CONFLICT DO NOTHING;

DELETE FROM "Signup" WHERE "status" = 'WAITLISTED';

ALTER TABLE "Signup"
  DROP COLUMN IF EXISTS "waitlistPosition",
  DROP COLUMN IF EXISTS "waitlistedAt",
  DROP COLUMN IF EXISTS "promotedAt";

DROP INDEX IF EXISTS "Signup_shiftId_waitlistPosition_idx";
CREATE INDEX IF NOT EXISTS "Signup_shiftId_status_idx" ON "Signup"("shiftId", "status");

ALTER TABLE "WaitlistEntry"
  ADD CONSTRAINT "WaitlistEntry_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WaitlistEntry"
  ADD CONSTRAINT "WaitlistEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
