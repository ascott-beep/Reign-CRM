-- Additive only: nullable columns, a loosened NOT NULL, and a new table/enum. No data loss.

ALTER TABLE "Organization" ADD COLUMN "archivedById" TEXT, ADD COLUMN "archiveReason" TEXT;
ALTER TABLE "Person" ADD COLUMN "archivedById" TEXT, ADD COLUMN "archiveReason" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "archivedById" TEXT, ADD COLUMN "archiveReason" TEXT;
ALTER TABLE "Mandate" ADD COLUMN "archivedById" TEXT, ADD COLUMN "archiveReason" TEXT;

-- Invited users have no password yet until they set one via the invite link.
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

ALTER TABLE "Workspace" ADD COLUMN "updateRatesAutomatically" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Workspace" ADD COLUMN "exchangeRatesUpdatedAt" TIMESTAMP(3);

CREATE TYPE "PasswordTokenPurpose" AS ENUM ('INVITE', 'RESET');

CREATE TABLE "PasswordToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" "PasswordTokenPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordToken_tokenHash_key" ON "PasswordToken"("tokenHash");
CREATE INDEX "PasswordToken_userId_idx" ON "PasswordToken"("userId");

ALTER TABLE "PasswordToken" ADD CONSTRAINT "PasswordToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
