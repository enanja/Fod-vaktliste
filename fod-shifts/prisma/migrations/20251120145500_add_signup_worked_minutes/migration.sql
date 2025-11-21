-- Ensure workedMinutes exists before making it optional
ALTER TABLE "Signup" ADD COLUMN IF NOT EXISTS "workedMinutes" INTEGER DEFAULT 0;
