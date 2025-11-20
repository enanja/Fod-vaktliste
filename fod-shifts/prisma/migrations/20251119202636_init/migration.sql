-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'FRIVILLIG');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('MORGEN', 'KVELD');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'FRIVILLIG',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "ShiftType" NOT NULL DEFAULT 'MORGEN',
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "maxVolunteers" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Signup" (
    "id" SERIAL PRIMARY KEY,
    "shiftId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Signup_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Signup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Signup_shiftId_userId_key" ON "Signup"("shiftId", "userId");
