-- AlterTable
ALTER TABLE "Mandate" ADD COLUMN     "portfolioCompanyId" TEXT;

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "portfolioCompanyId" TEXT;

-- CreateIndex
CREATE INDEX "Mandate_portfolioCompanyId_idx" ON "Mandate"("portfolioCompanyId");

-- CreateIndex
CREATE INDEX "Opportunity_portfolioCompanyId_idx" ON "Opportunity"("portfolioCompanyId");

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_portfolioCompanyId_fkey" FOREIGN KEY ("portfolioCompanyId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_portfolioCompanyId_fkey" FOREIGN KEY ("portfolioCompanyId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
