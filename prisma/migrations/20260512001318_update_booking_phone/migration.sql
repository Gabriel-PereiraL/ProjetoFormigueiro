/*
  Warnings:

  - The values [PENDING,CANCELED] on the enum `BookingStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `cancelToken` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `visitorEmail` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `blockReason` on the `slots` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[bookingCode]` on the table `bookings` will be added. If there are existing duplicate values, this will fail.
  - The required column `bookingCode` was added to the `bookings` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Changed the type of `period` on the `slots` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `createdById` on table `slots` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Period" AS ENUM ('MORNING', 'AFTERNOON');

-- AlterEnum
BEGIN;
CREATE TYPE "BookingStatus_new" AS ENUM ('CONFIRMED', 'CANCELLED');
ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "bookings" ALTER COLUMN "status" TYPE "BookingStatus_new" USING ("status"::text::"BookingStatus_new");
ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";
ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";
DROP TYPE "BookingStatus_old";
ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';
COMMIT;

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_canceledById_fkey";

-- DropForeignKey
ALTER TABLE "slots" DROP CONSTRAINT "slots_createdById_fkey";

-- DropIndex
DROP INDEX "bookings_cancelToken_key";

-- DropIndex
DROP INDEX "bookings_slotId_createdAt_idx";

-- DropIndex
DROP INDEX "bookings_visitorEmail_idx";

-- DropIndex
DROP INDEX "slots_date_blockedForSchool_idx";

-- DropIndex
DROP INDEX "users_role_active_idx";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "cancelToken",
DROP COLUMN "visitorEmail",
ADD COLUMN     "bookingCode" TEXT NOT NULL,
ADD COLUMN     "schoolName" TEXT,
ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';

-- AlterTable
ALTER TABLE "slots" DROP COLUMN "blockReason",
ALTER COLUMN "date" SET DATA TYPE DATE,
DROP COLUMN "period",
ADD COLUMN     "period" "Period" NOT NULL,
ALTER COLUMN "createdById" SET NOT NULL;

-- DropEnum
DROP TYPE "SlotPeriod";

-- CreateIndex
CREATE UNIQUE INDEX "bookings_bookingCode_key" ON "bookings"("bookingCode");

-- CreateIndex
CREATE INDEX "bookings_visitorPhone_idx" ON "bookings"("visitorPhone");

-- CreateIndex
CREATE INDEX "slots_date_period_active_idx" ON "slots"("date", "period", "active");

-- CreateIndex
CREATE UNIQUE INDEX "slots_date_period_key" ON "slots"("date", "period");

-- AddForeignKey
ALTER TABLE "slots" ADD CONSTRAINT "slots_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
