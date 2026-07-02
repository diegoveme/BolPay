import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type {
  ChainTxResult,
  DeployEscrowParams,
  DeployResult,
  EscrowChainAdapter,
} from './escrow-chain.adapter';

/**
 * Development adapter: keeps the entire product flow working without touching
 * Stellar. Ids/hashes are clearly marked as simulated. Switch to the real
 * adapter with ESCROW_MODE=trustless_work.
 */
@Injectable()
export class SimulatedChainAdapter implements EscrowChainAdapter {
  private readonly logger = new Logger(SimulatedChainAdapter.name);

  deployMultiRelease(params: DeployEscrowParams): Promise<DeployResult> {
    const contractId = `CSIM${randomBytes(26).toString('hex').toUpperCase().slice(0, 52)}`;
    this.logger.log(
      `[simulated] deploy escrow "${params.title}" (${params.milestones.length} milestones) → ${contractId}`,
    );
    return Promise.resolve({ contractId, txHash: this.fakeHash() });
  }

  buildFundXdr(): Promise<string | null> {
    // No real chain → no signature needed; the caller records a simulated tx.
    return Promise.resolve(null);
  }

  buildChangeStatusXdr(): Promise<string | null> {
    return Promise.resolve(null);
  }

  buildApproveXdr(): Promise<string | null> {
    return Promise.resolve(null);
  }

  buildReleaseXdr(): Promise<string | null> {
    return Promise.resolve(null);
  }

  buildDisputeXdr(): Promise<string | null> {
    return Promise.resolve(null);
  }

  markMilestoneDone(
    contractId: string,
    milestoneIndex: number,
  ): Promise<ChainTxResult> {
    this.logger.log(
      `[simulated] milestone ${milestoneIndex} done on ${contractId}`,
    );
    return Promise.resolve({ txHash: this.fakeHash() });
  }

  approveMilestone(
    contractId: string,
    milestoneIndex: number,
  ): Promise<ChainTxResult> {
    this.logger.log(
      `[simulated] approve milestone ${milestoneIndex} on ${contractId}`,
    );
    return Promise.resolve({ txHash: this.fakeHash() });
  }

  releaseMilestone(
    contractId: string,
    milestoneIndex: number,
  ): Promise<ChainTxResult> {
    this.logger.log(
      `[simulated] release milestone ${milestoneIndex} on ${contractId}`,
    );
    return Promise.resolve({ txHash: this.fakeHash() });
  }

  resolveDispute(
    contractId: string,
    milestoneIndex: number,
    distributions: [string, string][],
  ): Promise<ChainTxResult> {
    this.logger.log(
      `[simulated] resolve milestone ${milestoneIndex} on ${contractId}: ${JSON.stringify(distributions)}`,
    );
    return Promise.resolve({ txHash: this.fakeHash() });
  }

  submitSigned(): Promise<string> {
    // No real chain in simulated mode; nothing to broadcast.
    return Promise.resolve(this.fakeHash());
  }

  private fakeHash(): string {
    return `SIM${randomBytes(30).toString('hex')}`;
  }
}
