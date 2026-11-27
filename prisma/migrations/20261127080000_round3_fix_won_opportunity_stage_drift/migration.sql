-- Round 3 item 1: an opportunity already linked to a mandate (wonMandateId set) must always
-- read as Won. The old "Mark won" board reconciliation let a linked opportunity's stage drift
-- away from WON (e.g. back to Proposal/Terms) without ever un-linking the mandate, which is how
-- the Vantage Logistics Group CFO search ended up sitting in Proposal/Terms while its mandate
-- was already live. The app no longer allows this to happen (see changeOpportunityStageAction's
-- guard in src/app/(app)/opportunities/actions.ts) — this is a one-off, idempotent data repair
-- for any opportunity already in that state. No schema change; safe to re-run.
UPDATE "Opportunity"
SET
  "stage" = 'WON',
  "stageProbabilityDefault" = 100,
  "probabilityOverride" = NULL,
  "isProbabilityOverridden" = false,
  "lossReason" = NULL,
  "lossExplanation" = NULL,
  "onHoldReason" = NULL,
  "holdReviewDate" = NULL,
  "closedAt" = COALESCE("closedAt", now())
WHERE "wonMandateId" IS NOT NULL
  AND "stage" <> 'WON';
