-- CreateEnum
CREATE TYPE "IntelligenceReviewState" AS ENUM ('PENDING_REVIEW', 'ACCEPTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "IntelligenceDismissReason" AS ENUM ('NOT_RELEVANT', 'WRONG_COMPANY', 'ALREADY_KNEW');

-- CreateEnum
CREATE TYPE "IntelligenceRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

-- AlterTable
ALTER TABLE "IntelligenceItem" ADD COLUMN     "dismissReason" "IntelligenceDismissReason",
ADD COLUMN     "dismissedAt" TIMESTAMP(3),
ADD COLUMN     "reviewState" "IntelligenceReviewState" NOT NULL DEFAULT 'ACCEPTED',
ADD COLUMN     "runId" TEXT;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "intelligenceSignalTypes" "IntelligenceType"[] DEFAULT ARRAY[]::"IntelligenceType"[],
ADD COLUMN     "intelligenceSweepEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "intelligenceSweepHourUtc" INTEGER NOT NULL DEFAULT 6;

-- CreateTable
CREATE TABLE "IntelligenceSource" (
    "id" TEXT NOT NULL,
    "intelligenceItemId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntelligenceSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelligenceRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "organizationId" TEXT,
    "provider" TEXT NOT NULL,
    "status" "IntelligenceRunStatus" NOT NULL DEFAULT 'RUNNING',
    "signalsFound" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(10,4),
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "IntelligenceRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntelligenceSource_intelligenceItemId_idx" ON "IntelligenceSource"("intelligenceItemId");

-- CreateIndex
CREATE INDEX "IntelligenceRun_workspaceId_startedAt_idx" ON "IntelligenceRun"("workspaceId", "startedAt");

-- CreateIndex
CREATE INDEX "IntelligenceRun_organizationId_idx" ON "IntelligenceRun"("organizationId");

-- CreateIndex
CREATE INDEX "IntelligenceItem_workspaceId_reviewState_idx" ON "IntelligenceItem"("workspaceId", "reviewState");

-- AddForeignKey
ALTER TABLE "IntelligenceItem" ADD CONSTRAINT "IntelligenceItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "IntelligenceRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceSource" ADD CONSTRAINT "IntelligenceSource_intelligenceItemId_fkey" FOREIGN KEY ("intelligenceItemId") REFERENCES "IntelligenceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceRun" ADD CONSTRAINT "IntelligenceRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceRun" ADD CONSTRAINT "IntelligenceRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
