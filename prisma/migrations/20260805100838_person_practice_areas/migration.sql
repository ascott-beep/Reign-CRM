-- AlterTable
ALTER TABLE "PracticeArea" ADD COLUMN     "colorHex" TEXT;

-- CreateTable
CREATE TABLE "PersonPracticeArea" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "practiceAreaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonPracticeArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonPracticeArea_personId_idx" ON "PersonPracticeArea"("personId");

-- CreateIndex
CREATE INDEX "PersonPracticeArea_practiceAreaId_idx" ON "PersonPracticeArea"("practiceAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonPracticeArea_personId_practiceAreaId_key" ON "PersonPracticeArea"("personId", "practiceAreaId");

-- AddForeignKey
ALTER TABLE "PersonPracticeArea" ADD CONSTRAINT "PersonPracticeArea_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonPracticeArea" ADD CONSTRAINT "PersonPracticeArea_practiceAreaId_fkey" FOREIGN KEY ("practiceAreaId") REFERENCES "PracticeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
