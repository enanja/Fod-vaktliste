-- Make workedMinutes optional so admins can fill in actual minutes when needed
ALTER TABLE "Signup" ALTER COLUMN "workedMinutes" DROP NOT NULL;
ALTER TABLE "Signup" ALTER COLUMN "workedMinutes" DROP DEFAULT;
