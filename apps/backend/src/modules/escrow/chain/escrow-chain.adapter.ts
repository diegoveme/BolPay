/**
 * Abstraction over the on-chain escrow provider (Trustless Work on Stellar).
 *
 * Two implementations are bound depending on ESCROW_MODE:
 *  - TrustlessWorkAdapter: real testnet operations (requires API key + platform signer)
 *  - SimulatedChainAdapter: deterministic fake ids/hashes for local development
 */

export const ESCROW_CHAIN_ADAPTER = Symbol('ESCROW_CHAIN_ADAPTER');

export interface ChainMilestone {
  description: string;
  /** Amount in the escrow asset (USDC). */
  amount: number;
  /** Stellar G-address that receives this milestone's funds. */
  receiver: string;
}

export interface DeployEscrowParams {
  engagementId: string;
  title: string;
  description: string;
  milestones: ChainMilestone[];
}

export interface ChainTxResult {
  txHash: string;
}

export interface DeployResult extends ChainTxResult {
  /** Soroban contract id of the deployed escrow. */
  contractId: string;
}

export interface EscrowChainAdapter {
  /** Deploy a multi-release escrow with one on-chain milestone per entry. */
  deployMultiRelease(params: DeployEscrowParams): Promise<DeployResult>;

  /** Move funds into the escrow (signed by the platform funding account). */
  fundEscrow(contractId: string, amount: string): Promise<ChainTxResult>;

  /** Service-provider side: mark a milestone as delivered with evidence. */
  markMilestoneDone(
    contractId: string,
    milestoneIndex: number,
    evidence: string,
  ): Promise<ChainTxResult>;

  /** Approver side: approve the milestone. */
  approveMilestone(
    contractId: string,
    milestoneIndex: number,
  ): Promise<ChainTxResult>;

  /** Release-signer side: release the approved milestone's funds. */
  releaseMilestone(
    contractId: string,
    milestoneIndex: number,
  ): Promise<ChainTxResult>;

  /** Flag a milestone as disputed (locks its funds). */
  disputeMilestone(
    contractId: string,
    milestoneIndex: number,
  ): Promise<ChainTxResult>;

  /** Resolve a disputed milestone by distributing its funds. */
  resolveDispute(
    contractId: string,
    milestoneIndex: number,
    distributions: [address: string, amount: string][],
  ): Promise<ChainTxResult>;
}
