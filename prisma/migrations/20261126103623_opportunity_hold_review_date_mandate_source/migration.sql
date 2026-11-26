-- Additive only: new nullable enum + nullable columns, no data loss.
CREATE TYPE "MandateSource" AS ENUM ('DIRECT_CLIENT', 'FUND_INTRODUCTION', 'REPEAT_BUSINESS');

ALTER TABLE "Opportunity" ADD COLUMN "holdReviewDate" TIMESTAMP(3);
ALTER TABLE "Mandate" ADD COLUMN "source" "MandateSource";
