-- DropIndex
DROP INDEX "IntelligenceItem_title_trgm_idx";

-- DropIndex
DROP INDEX "Mandate_reference_trgm_idx";

-- DropIndex
DROP INDEX "Mandate_title_trgm_idx";

-- DropIndex
DROP INDEX "Opportunity_name_trgm_idx";

-- DropIndex
DROP INDEX "Opportunity_role_trgm_idx";

-- DropIndex
DROP INDEX "Organization_name_trgm_idx";

-- DropIndex
DROP INDEX "Organization_website_trgm_idx";

-- DropIndex
DROP INDEX "Person_firstName_trgm_idx";

-- DropIndex
DROP INDEX "Person_lastName_trgm_idx";

-- DropIndex
DROP INDEX "Person_primaryEmail_trgm_idx";

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "opportunityStageProbabilities" JSONB;
