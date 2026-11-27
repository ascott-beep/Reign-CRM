-- CreateEnum
CREATE TYPE "MailProvider" AS ENUM ('MICROSOFT', 'GOOGLE');

-- CreateEnum
CREATE TYPE "MailboxConnectionStatus" AS ENUM ('ACTIVE', 'ERROR', 'DISCONNECTED');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "externalMessageId" TEXT,
ADD COLUMN     "private" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MailboxConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "MailProvider" NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "emailSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "calendarSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "status" "MailboxConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastErrorMessage" TEXT,
    "lastEmailSyncAt" TIMESTAMP(3),
    "lastCalendarSyncAt" TIMESTAMP(3),
    "emailSyncCursor" TEXT,
    "calendarSyncCursor" TEXT,
    "graphSubscriptionId" TEXT,
    "graphSubscriptionExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailboxConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeverSyncAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NeverSyncAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MailboxConnection_userId_idx" ON "MailboxConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MailboxConnection_userId_provider_key" ON "MailboxConnection"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "NeverSyncAddress_userId_emailAddress_key" ON "NeverSyncAddress"("userId", "emailAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_externalMessageId_key" ON "Activity"("externalMessageId");

-- AddForeignKey
ALTER TABLE "MailboxConnection" ADD CONSTRAINT "MailboxConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeverSyncAddress" ADD CONSTRAINT "NeverSyncAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

