-- Additive only: adds FK constraints for the archivedById columns from the
-- previous migration so Prisma's `archivedBy` relation can join to User.
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Person" ADD CONSTRAINT "Person_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Additive enum value: lets the cancel-invite / GDPR-erasure actions log a
-- hard delete distinct from the existing soft-delete ARCHIVE action.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DELETE';
