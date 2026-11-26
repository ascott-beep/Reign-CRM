-- Additive only: nullable column, no data loss, safe to run on a live table.
ALTER TABLE "CandidateProcess" ADD COLUMN "exitDecidedBy" TEXT;
