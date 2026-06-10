import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Keypair, Networks, TransactionBuilder } from '@stellar/stellar-sdk';
import type {
  ChainTxResult,
  DeployEscrowParams,
  DeployResult,
  EscrowChainAdapter,
} from './escrow-chain.adapter';

/**
 * Real escrow operations against the Trustless Work REST API (Stellar testnet).
 *
 * Custody model: BolPay operates the escrow with a platform-controlled testnet
 * account that holds every escrow role (approver, releaseSigner, platform,
 * disputeResolver, funding signer). Milestone receivers are the freelancers'
 * Pollar-managed wallets, so released funds land directly in their wallets.
 * Each TW endpoint returns an unsigned XDR which we sign with the platform key
 * and submit via /helper/send-transaction.
 */
@Injectable()
export class TrustlessWorkAdapter implements EscrowChainAdapter {
  private readonly logger = new Logger(TrustlessWorkAdapter.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly usdcIssuer: string;
  private readonly keypair: Keypair;
  private readonly networkPassphrase: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('trustlessWork.apiUrl')!;
    this.apiKey = config.get<string>('trustlessWork.apiKey') ?? '';
    this.usdcIssuer = config.get<string>('stellar.usdcIssuer')!;
    const secret = config.get<string>('stellar.platformSecret') ?? '';
    if (!this.apiKey || !secret) {
      throw new Error(
        'ESCROW_MODE=trustless_work requires TRUSTLESS_WORK_API_KEY and STELLAR_PLATFORM_SECRET',
      );
    }
    this.keypair = Keypair.fromSecret(secret);
    this.networkPassphrase =
      config.get<string>('stellar.network') === 'mainnet'
        ? Networks.PUBLIC
        : Networks.TESTNET;
  }

  private get platformAddress(): string {
    return this.keypair.publicKey();
  }

  async deployMultiRelease(params: DeployEscrowParams): Promise<DeployResult> {
    const { unsignedTransaction } = await this.post<{
      unsignedTransaction: string;
    }>('/deployer/multi-release', {
      signer: this.platformAddress,
      engagementId: params.engagementId,
      title: params.title,
      description: params.description || params.title,
      roles: {
        approver: this.platformAddress,
        serviceProvider: this.platformAddress,
        platformAddress: this.platformAddress,
        releaseSigner: this.platformAddress,
        disputeResolver: this.platformAddress,
      },
      platformFee: 0,
      milestones: params.milestones.map((m) => ({
        description: m.description,
        amount: m.amount,
        receiver: m.receiver,
      })),
      trustline: { address: this.usdcIssuer, symbol: 'USDC' },
    });

    const result = await this.signAndSend(unsignedTransaction);
    if (!result.contractId) {
      throw new InternalServerErrorException(
        'Trustless Work did not return a contractId after deploy',
      );
    }
    return { contractId: result.contractId, txHash: result.txHash };
  }

  async fundEscrow(contractId: string, amount: string): Promise<ChainTxResult> {
    const { unsignedTransaction } = await this.post<{
      unsignedTransaction: string;
    }>('/escrow/multi-release/fund-escrow', {
      contractId,
      signer: this.platformAddress,
      amount,
    });
    return this.signAndSend(unsignedTransaction);
  }

  async markMilestoneDone(
    contractId: string,
    milestoneIndex: number,
    evidence: string,
  ): Promise<ChainTxResult> {
    const { unsignedTransaction } = await this.post<{
      unsignedTransaction: string;
    }>('/escrow/multi-release/change-milestone-status', {
      contractId,
      milestoneIndex: String(milestoneIndex),
      newStatus: 'Completed',
      newEvidence: evidence || 'delivered',
      serviceProvider: this.platformAddress,
    });
    return this.signAndSend(unsignedTransaction);
  }

  async approveMilestone(
    contractId: string,
    milestoneIndex: number,
  ): Promise<ChainTxResult> {
    const { unsignedTransaction } = await this.post<{
      unsignedTransaction: string;
    }>('/escrow/multi-release/approve-milestone', {
      contractId,
      milestoneIndex: String(milestoneIndex),
      approver: this.platformAddress,
    });
    return this.signAndSend(unsignedTransaction);
  }

  async releaseMilestone(
    contractId: string,
    milestoneIndex: number,
  ): Promise<ChainTxResult> {
    const { unsignedTransaction } = await this.post<{
      unsignedTransaction: string;
    }>('/escrow/multi-release/release-milestone-funds', {
      contractId,
      milestoneIndex: String(milestoneIndex),
      releaseSigner: this.platformAddress,
    });
    return this.signAndSend(unsignedTransaction);
  }

  async disputeMilestone(
    contractId: string,
    milestoneIndex: number,
  ): Promise<ChainTxResult> {
    const { unsignedTransaction } = await this.post<{
      unsignedTransaction: string;
    }>('/escrow/multi-release/dispute-escrow', {
      contractId,
      milestoneIndex: String(milestoneIndex),
      signer: this.platformAddress,
    });
    return this.signAndSend(unsignedTransaction);
  }

  async resolveDispute(
    contractId: string,
    milestoneIndex: number,
    distributions: [string, string][],
  ): Promise<ChainTxResult> {
    const { unsignedTransaction } = await this.post<{
      unsignedTransaction: string;
    }>('/escrow/multi-release/resolve-dispute', {
      contractId,
      milestoneIndex: String(milestoneIndex),
      disputeResolver: this.platformAddress,
      distributions,
    });
    return this.signAndSend(unsignedTransaction);
  }

  // -- HTTP / signing helpers --------------------------------------------------

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Trustless Work uses x-api-key, not Authorization: Bearer.
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok) {
      this.logger.error(
        `TW ${path} → ${response.status}: ${JSON.stringify(payload)}`,
      );
      const message =
        typeof payload.message === 'string' ? payload.message : 'unknown';
      throw new ServiceUnavailableException(
        `Trustless Work error (${response.status}): ${message}`,
      );
    }
    return payload as T;
  }

  /** Sign the XDR with the platform key and broadcast it through TW. */
  private async signAndSend(
    unsignedXdr: string,
  ): Promise<ChainTxResult & { contractId?: string }> {
    const tx = TransactionBuilder.fromXDR(unsignedXdr, this.networkPassphrase);
    tx.sign(this.keypair);

    const result = await this.post<Record<string, unknown>>(
      '/helper/send-transaction',
      {
        signedXdr: tx.toXDR(),
      },
    );
    const txHash =
      (result.hash as string | undefined) ??
      (result.txHash as string | undefined) ??
      tx.hash().toString('hex');
    return { txHash, contractId: result.contractId as string | undefined };
  }
}
