-- Baseline schema. Everything in prisma/schema.prisma, generated with
-- `prisma migrate diff --from-empty`. The no-double-booking exclusion
-- constraint is layered on top by the migration that follows this one.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'BARBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('CONFIRMATION', 'REMINDER_24H', 'RESCHEDULE', 'CANCELLATION');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('SCHEDULED', 'SENT', 'DELIVERED', 'FAILED', 'CANCELED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "smsOptIn" BOOLEAN NOT NULL DEFAULT false,
    "smsOptInAt" TIMESTAMP(3),
    "smsOptOutAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barbers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "title" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "chairNumber" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "barbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "bufferMin" INTEGER NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barber_services" (
    "barberId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "priceCents" INTEGER,
    "durationMin" INTEGER,

    CONSTRAINT "barber_services_pkey" PRIMARY KEY ("barberId","serviceId")
);

-- CreateTable
CREATE TABLE "working_hours" (
    "id" TEXT NOT NULL,
    "barberId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "openMinute" INTEGER NOT NULL,
    "closeMinute" INTEGER NOT NULL,

    CONSTRAINT "working_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_off" (
    "id" TEXT NOT NULL,
    "barberId" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "time_off_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "barberId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "priceCents" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "confirmationCode" TEXT NOT NULL,
    "notes" TEXT,
    "idempotencyKey" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "toPhone" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "providerSid" TEXT,
    "scheduledAt" TIMESTAMPTZ(3),
    "sentAt" TIMESTAMPTZ(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_lastName_firstName_idx" ON "users"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "barbers_userId_key" ON "barbers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "barbers_slug_key" ON "barbers"("slug");

-- CreateIndex
CREATE INDEX "barbers_isActive_sortOrder_idx" ON "barbers"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex
CREATE INDEX "services_isActive_sortOrder_idx" ON "services"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "working_hours_barberId_weekday_idx" ON "working_hours"("barberId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "working_hours_barberId_weekday_openMinute_key" ON "working_hours"("barberId", "weekday", "openMinute");

-- CreateIndex
CREATE INDEX "time_off_barberId_startsAt_endsAt_idx" ON "time_off"("barberId", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_confirmationCode_key" ON "appointments"("confirmationCode");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_idempotencyKey_key" ON "appointments"("idempotencyKey");

-- CreateIndex
CREATE INDEX "appointments_barberId_startsAt_idx" ON "appointments"("barberId", "startsAt");

-- CreateIndex
CREATE INDEX "appointments_clientId_startsAt_idx" ON "appointments"("clientId", "startsAt");

-- CreateIndex
CREATE INDEX "appointments_status_startsAt_idx" ON "appointments"("status", "startsAt");

-- CreateIndex
CREATE INDEX "notifications_status_scheduledAt_idx" ON "notifications"("status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_appointmentId_kind_key" ON "notifications"("appointmentId", "kind");

-- AddForeignKey
ALTER TABLE "barbers" ADD CONSTRAINT "barbers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barber_services" ADD CONSTRAINT "barber_services_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "barbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barber_services" ADD CONSTRAINT "barber_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "barbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "barbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "barbers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

