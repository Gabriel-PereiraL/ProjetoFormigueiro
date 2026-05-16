/*
  Warnings:

  - Added the required column `visitorEmail` to the `bookings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "visitorEmail" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "bookings_visitorEmail_idx" ON "bookings"("visitorEmail");
