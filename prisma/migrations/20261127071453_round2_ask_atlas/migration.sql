-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "askAtlasEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "AskAtlasQuery" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "usedWebSearch" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AskAtlasQuery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AskAtlasQuery_workspaceId_createdAt_idx" ON "AskAtlasQuery"("workspaceId", "createdAt");

-- AddForeignKey
ALTER TABLE "AskAtlasQuery" ADD CONSTRAINT "AskAtlasQuery_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AskAtlasQuery" ADD CONSTRAINT "AskAtlasQuery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

