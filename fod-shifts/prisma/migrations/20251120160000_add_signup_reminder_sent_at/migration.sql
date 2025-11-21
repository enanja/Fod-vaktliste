-- Track when a volunteer reminder was sent for a signup
ALTER TABLE "Signup" ADD COLUMN "reminderSentAt" TIMESTAMP(3);
