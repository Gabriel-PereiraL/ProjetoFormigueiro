-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELED');

-- CreateEnum
CREATE TYPE "SlotPeriod" AS ENUM ('MORNING', 'AFTERNOON');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slots" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "period" "SlotPeriod" NOT NULL,
    "maxCapacity" INTEGER NOT NULL DEFAULT 20,
    "blockedForSchool" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "visitorEmail" TEXT NOT NULL,
    "visitorPhone" TEXT NOT NULL,
    "visitorCount" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "cancelToken" TEXT NOT NULL,
    "notes" TEXT,
    "canceledAt" TIMESTAMP(3),
    "canceledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_active_idx" ON "users"("role", "active");

-- CreateIndex
CREATE INDEX "slots_date_period_active_idx" ON "slots"("date", "period", "active");

-- CreateIndex
CREATE INDEX "slots_date_blockedForSchool_idx" ON "slots"("date", "blockedForSchool");

-- CreateIndex
CREATE UNIQUE INDEX "slots_date_period_key" ON "slots"("date", "period");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_cancelToken_key" ON "bookings"("cancelToken");

-- CreateIndex
CREATE INDEX "bookings_slotId_status_idx" ON "bookings"("slotId", "status");

-- CreateIndex
CREATE INDEX "bookings_visitorEmail_idx" ON "bookings"("visitorEmail");

-- CreateIndex
CREATE INDEX "bookings_slotId_createdAt_idx" ON "bookings"("slotId", "createdAt");

-- AddForeignKey
ALTER TABLE "slots" ADD CONSTRAINT "slots_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_canceledById_fkey" FOREIGN KEY ("canceledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
