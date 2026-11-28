-- CreateEnum
CREATE TYPE "PersonCategory" AS ENUM ('CANDIDATE', 'CLIENT_CONTACT', 'OTHER');

-- CreateEnum
CREATE TYPE "RoleAtFirm" AS ENUM ('MANAGING_PARTNER', 'PARTNER', 'OPERATING_PARTNER', 'PRINCIPAL', 'INVESTMENT_DIRECTOR', 'ASSOCIATE', 'HEAD_OF_TALENT', 'HEAD_OF_PORTFOLIO', 'PORTFOLIO_CEO', 'PORTFOLIO_CFO', 'CHAIR', 'NON_EXEC', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactRelationship" AS ENUM ('COLD', 'WARM', 'STRONG', 'CLIENT');

-- CreateEnum
CREATE TYPE "DecisionRole" AS ENUM ('HIRING_DECISION_MAKER', 'INFLUENCER', 'GATEKEEPER', 'REFERRER');

-- CreateEnum
CREATE TYPE "InvestmentRegion" AS ENUM ('UNITED_KINGDOM', 'DACH', 'BENELUX', 'NORDICS', 'MIDDLE_EAST');

-- CreateEnum
CREATE TYPE "DealType" AS ENUM ('PRIMARY_BUYOUT', 'SECONDARY_BUYOUT', 'CARVE_OUT', 'GROWTH_INVESTMENT', 'TAKE_PRIVATE', 'BUY_AND_BUILD_ADD_ON');

-- CreateEnum
CREATE TYPE "OwnershipLevel" AS ENUM ('MAJORITY', 'MINORITY', 'CO_CONTROL');

-- CreateEnum
CREATE TYPE "DealExperience" AS ENUM ('BUY_AND_BUILD', 'CARVE_OUT', 'REFINANCING', 'EXIT_OR_SALE', 'IPO', 'TURNAROUND', 'INTEGRATION');

-- CreateEnum
CREATE TYPE "EquityType" AS ENUM ('NONE', 'SWEET_EQUITY', 'OPTIONS', 'CO_INVEST');

-- CreateEnum
CREATE TYPE "OpenToOption" AS ENUM ('PERMANENT', 'INTERIM', 'NON_EXEC');

-- CreateEnum
CREATE TYPE "CandidateLookingStatus" AS ENUM ('ACTIVELY_LOOKING', 'OPEN_TO_OFFERS', 'NOT_LOOKING', 'PLACED_BY_US');

-- AlterTable
ALTER TABLE "CandidateProfile" ADD COLUMN     "dealExperience" "DealExperience"[],
ADD COLUMN     "equityType" "EquityType",
ADD COLUMN     "exitsDelivered" INTEGER,
ADD COLUMN     "lookingStatus" "CandidateLookingStatus",
ADD COLUMN     "openTo" "OpenToOption"[],
ADD COLUMN     "peBackedRolesCount" INTEGER;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "currentFundName" TEXT,
ADD COLUMN     "ebitdaAmount" DECIMAL(16,2),
ADD COLUMN     "ebitdaCurrency" VARCHAR(3),
ADD COLUMN     "fundSizeAmount" DECIMAL(18,2),
ADD COLUMN     "fundSizeCurrency" VARCHAR(3),
ADD COLUMN     "fundVintageYear" INTEGER,
ADD COLUMN     "investmentRegions" "InvestmentRegion"[];

-- AlterTable
ALTER TABLE "OrganizationRelationship" ADD COLUMN     "dealType" "DealType",
ADD COLUMN     "fundVehicleName" TEXT,
ADD COLUMN     "ownershipLevel" "OwnershipLevel";

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "personCategory" "PersonCategory";

-- CreateTable
CREATE TABLE "OrganizationPracticeArea" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "practiceAreaId" TEXT NOT NULL,

    CONSTRAINT "OrganizationPracticeArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientContactProfile" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "roleAtFirm" "RoleAtFirm",
    "relationship" "ContactRelationship",
    "decisionRole" "DecisionRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientContactProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientContactCoveredOrganization" (
    "id" TEXT NOT NULL,
    "clientContactProfileId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "ClientContactCoveredOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationPracticeArea_organizationId_practiceAreaId_key" ON "OrganizationPracticeArea"("organizationId", "practiceAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientContactProfile_personId_key" ON "ClientContactProfile"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientContactCoveredOrganization_clientContactProfileId_org_key" ON "ClientContactCoveredOrganization"("clientContactProfileId", "organizationId");

-- AddForeignKey
ALTER TABLE "OrganizationPracticeArea" ADD CONSTRAINT "OrganizationPracticeArea_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationPracticeArea" ADD CONSTRAINT "OrganizationPracticeArea_practiceAreaId_fkey" FOREIGN KEY ("practiceAreaId") REFERENCES "PracticeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContactProfile" ADD CONSTRAINT "ClientContactProfile_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContactCoveredOrganization" ADD CONSTRAINT "ClientContactCoveredOrganization_clientContactProfileId_fkey" FOREIGN KEY ("clientContactProfileId") REFERENCES "ClientContactProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContactCoveredOrganization" ADD CONSTRAINT "ClientContactCoveredOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
