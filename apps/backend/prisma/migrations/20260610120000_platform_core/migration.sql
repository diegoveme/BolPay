-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('google', 'github', 'discord', 'email', 'wallet');

-- CreateEnum
CREATE TYPE "DeliverableStatus" AS ENUM ('submitted', 'changes_requested', 'approved');

-- CreateEnum
CREATE TYPE "DisputeOutcome" AS ENUM ('release_to_freelancer', 'refund_to_company', 'split');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('pending', 'accepted', 'revoked', 'expired');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContractStatus" ADD VALUE 'pending_acceptance';
ALTER TYPE "ContractStatus" ADD VALUE 'changes_requested';
ALTER TYPE "ContractStatus" ADD VALUE 'rejected';

-- AlterEnum
ALTER TYPE "EscrowStatus" ADD VALUE 'disputed';

-- DropIndex
DROP INDEX "notifications_user_id_idx";

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "accepted_at" TIMESTAMP(3),
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "deadline" DATE,
ADD COLUMN     "review_note" TEXT;

-- AlterTable
ALTER TABLE "deliverables" ADD COLUMN     "note" TEXT,
ADD COLUMN     "review_note" TEXT,
ADD COLUMN     "status" "DeliverableStatus" NOT NULL DEFAULT 'submitted',
ADD COLUMN     "submitted_by" UUID NOT NULL;

-- AlterTable
ALTER TABLE "dispute_evidence" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "disputes" ADD COLUMN     "company_amount" DECIMAL(20,7),
ADD COLUMN     "freelancer_amount" DECIMAL(20,7),
ADD COLUMN     "outcome" "DisputeOutcome",
ADD COLUMN     "reason" TEXT NOT NULL,
ADD COLUMN     "resolved_at" TIMESTAMP(3),
ADD COLUMN     "resolved_by" UUID;

-- AlterTable
ALTER TABLE "escrows" ADD COLUMN     "asset" TEXT NOT NULL DEFAULT 'USDC',
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "released_amount" DECIMAL(20,7);

-- AlterTable
ALTER TABLE "milestones" ADD COLUMN     "description" TEXT,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "data" JSONB;

-- AlterTable
ALTER TABLE "payroll_executions" ADD COLUMN     "total_amount" DECIMAL(20,7) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "payroll_items" ADD COLUMN     "recipient_label" TEXT,
ADD COLUMN     "recipient_user_id" UUID;

-- AlterTable
ALTER TABLE "payrolls" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "name" TEXT NOT NULL,
ALTER COLUMN "next_run" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "payroll_execution_id" UUID;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "password_hash",
ADD COLUMN     "auth_provider" "AuthProvider" NOT NULL,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "pollar_wallet_id" TEXT,
ADD COLUMN     "stellar_address" TEXT;

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'pending',
    "invited_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_email_idx" ON "invitations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "deliverables_milestone_id_version_key" ON "deliverables"("milestone_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "escrows_trustless_work_id_key" ON "escrows"("trustless_work_id");

-- CreateIndex
CREATE UNIQUE INDEX "milestones_contract_id_position_key" ON "milestones"("contract_id", "position");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id", "read");

-- CreateIndex
CREATE INDEX "transactions_payroll_execution_id_idx" ON "transactions"("payroll_execution_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_stellar_address_key" ON "users"("stellar_address");

-- CreateIndex
CREATE UNIQUE INDEX "users_pollar_wallet_id_key" ON "users"("pollar_wallet_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_stellar_address_key" ON "wallets"("user_id", "stellar_address");

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payroll_execution_id_fkey" FOREIGN KEY ("payroll_execution_id") REFERENCES "payroll_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

