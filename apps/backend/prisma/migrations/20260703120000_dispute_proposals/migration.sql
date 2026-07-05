-- Mutual dispute resolution: a standing proposal that the OTHER party must
-- accept (or counter-propose) before the split executes on-chain.
ALTER TABLE "disputes"
  ADD COLUMN "proposal_outcome" "DisputeOutcome",
  ADD COLUMN "proposal_freelancer_amount" DECIMAL(20,7),
  ADD COLUMN "proposal_company_amount" DECIMAL(20,7),
  ADD COLUMN "proposal_note" TEXT,
  ADD COLUMN "proposed_by" UUID,
  ADD COLUMN "proposed_at" TIMESTAMP(3);

ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_proposed_by_fkey"
  FOREIGN KEY ("proposed_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
