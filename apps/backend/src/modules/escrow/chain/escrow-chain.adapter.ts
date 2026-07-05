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

/**
 * Stellar addresses for the non-custodial escrow roles. The platform fills
 * `platformAddress` + `disputeResolver` with its OWN (arbiter) address; these
 * are the parties that sign their own operations.
 */
export interface EscrowRoles {
  /** Validates and approves milestones (the company). */
  approver: string;
  /** Delivers the work (the freelancer). */
  serviceProvider: string;
  /**
   * Releases approved milestone funds. Omit to default to the platform, which
   * executes the payout to the milestone's locked receiver (the freelancer)
   * after the company approves. It can only pay that fixed address, never
   * redirect/skim, so a single company approval covers approve + payout.
   */
  releaseSigner?: string;
  /**
   * Executes the mutually-agreed dispute resolution on-chain. Omit to default
   * to the platform: it can only split the locked funds between the two
   * parties' addresses (never redirect/skim), so it safely executes whatever
   * outcome the parties agreed to. Opening a dispute is still signed by a party.
   */
  disputeResolver?: string;
}

export interface DeployEscrowParams {
  engagementId: string;
  title: string;
  description: string;
  milestones: ChainMilestone[];
  /** Non-custodial role addresses; omit in simulated mode. */
  roles?: EscrowRoles;
}

/**
 * One recipient share of a resolved dispute. Trustless Work expects objects
 * with a NUMBER amount (not [address, amount] tuples), and rejects amounts <= 0,
 * so callers must omit any zero share.
 */
export interface ChainDistribution {
  address: string;
  amount: number;
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

  /**
   * Build (but DO NOT sign) the fund transaction so the funder signs it with
   * their OWN wallet (Pollar) - BolPay never moves the company's money.
   * Returns the unsigned XDR, or `null` when no on-chain signature is needed
   * (simulated mode).
   */
  buildFundXdr(
    contractId: string,
    amount: string,
    signerAddress: string,
  ): Promise<string | null>;

  /** Service-provider side: mark a milestone as delivered with evidence. */
  markMilestoneDone(
    contractId: string,
    milestoneIndex: number,
    evidence: string,
  ): Promise<ChainTxResult>;

  /**
   * Non-custodial: unsigned XDR for the service provider (freelancer) to sign
   * when marking a milestone delivered. null = simulated (no signature needed).
   */
  buildChangeStatusXdr(
    contractId: string,
    milestoneIndex: number,
    evidence: string,
    serviceProvider: string,
  ): Promise<string | null>;

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

  /** Non-custodial: unsigned XDR for the approver (company) to sign. null = simulated. */
  buildApproveXdr(
    contractId: string,
    milestoneIndex: number,
    approver: string,
  ): Promise<string | null>;

  /**
   * Non-custodial: unsigned dispute XDR for a PARTY to sign. TW only lets a
   * party (company or freelancer) open a dispute, so this is signed by whoever
   * raises it. null = simulated.
   */
  buildDisputeXdr(
    contractId: string,
    milestoneIndex: number,
    signer: string,
  ): Promise<string | null>;

  /** Resolve a disputed milestone by distributing its funds. */
  resolveDispute(
    contractId: string,
    milestoneIndex: number,
    distributions: ChainDistribution[],
  ): Promise<ChainTxResult>;

  /**
   * Broadcast a transaction already signed by a self-custodial wallet (Stellar
   * Wallets Kit). The client cannot reach Trustless Work directly (the API key
   * is server-side), so it relays the signed XDR through here. Returns the
   * on-chain hash. Pollar wallets sign+submit themselves and never use this.
   */
  submitSigned(signedXdr: string): Promise<string>;
}
