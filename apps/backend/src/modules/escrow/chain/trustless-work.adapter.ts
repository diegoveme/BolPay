import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Keypair, Networks, TransactionBuilder } from '@stellar/stellar-sdk';
import type {
  ChainDistribution,
  ChainTxResult,
  DeployEscrowParams,
  DeployResult,
  EscrowChainAdapter,
} from './escrow-chain.adapter';

/**
 * Real escrow operations against the Trustless Work REST API (Stellar testnet).
 *
 * Custody model: BolPay never holds the funds. They sit in the Soroban escrow
 * and can only ever move to the milestone receivers, which are fixed at deploy
 * time. What the platform does hold is the execution roles that the caller does
 * not assign (see deployMultiRelease), so it can trigger a release but cannot
 * redirect it or keep any of it. Each TW endpoint returns an unsigned XDR which
 * we sign with the platform key and submit via /helper/send-transaction, except
 * the funding one, which the company signs with its own wallet.
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

  /** The platform keypair's Stellar address (escrow signer and executor). */
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
      // Every role the caller leaves out falls back to the platform account.
      // Contract escrows name the company as approver and the freelancer as
      // service provider; payroll escrows name none, so the platform holds all
      // of them. Either way the platform ends up as releaseSigner and
      // disputeResolver, which is what lets it execute a release or settle an
      // agreed split on the parties' behalf. That is execution power, not
      // custody: the receivers are locked in below, so the funds can only reach
      // the addresses agreed at deploy time.
      roles: {
        approver: params.roles?.approver ?? this.platformAddress,
        serviceProvider: params.roles?.serviceProvider ?? this.platformAddress,
        platformAddress: this.platformAddress,
        releaseSigner: params.roles?.releaseSigner ?? this.platformAddress,
        disputeResolver: params.roles?.disputeResolver ?? this.platformAddress,
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

  /** Non-custodial: return the unsigned fund XDR for the funder to sign. */
  async buildFundXdr(
    contractId: string,
    amount: string,
    signerAddress: string,
  ): Promise<string | null> {
    const { unsignedTransaction } = await this.post<{
      unsignedTransaction: string;
    }>('/escrow/multi-release/fund-escrow', {
      contractId,
      signer: signerAddress,
      // TW validates amount as a NUMBER (not a string), so coerce it.
      amount: Number(amount),
    });
    return unsignedTransaction;
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

  /** Non-custodial: unsigned change-status XDR for the freelancer to sign. */
  async buildChangeStatusXdr(
    contractId: string,
    milestoneIndex: number,
    evidence: string,
    serviceProvider: string,
  ): Promise<string | null> {
    const { unsignedTransaction } = await this.post<{
      unsignedTransaction: string;
    }>('/escrow/multi-release/change-milestone-status', {
      contractId,
      milestoneIndex: String(milestoneIndex),
      newStatus: 'Completed',
      newEvidence: evidence || 'delivered',
      serviceProvider,
    });
    return unsignedTransaction;
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

  /** Non-custodial: unsigned approve XDR for the company (approver) to sign. */
  async buildApproveXdr(
    contractId: string,
    milestoneIndex: number,
    approver: string,
  ): Promise<string | null> {
    const { unsignedTransaction } = await this.post<{
      unsignedTransaction: string;
    }>('/escrow/multi-release/approve-milestone', {
      contractId,
      milestoneIndex: String(milestoneIndex),
      approver,
    });
    return unsignedTransaction;
  }

  /** Non-custodial: unsigned dispute XDR for a party (company/freelancer). */
  async buildDisputeXdr(
    contractId: string,
    milestoneIndex: number,
    signer: string,
  ): Promise<string | null> {
    // Multi-release escrows dispute a single milestone: `dispute-milestone`.
    // (`dispute-escrow` is the single-release path and 404s here.)
    const { unsignedTransaction } = await this.post<{
      unsignedTransaction: string;
    }>('/escrow/multi-release/dispute-milestone', {
      contractId,
      milestoneIndex: String(milestoneIndex),
      signer,
    });
    return unsignedTransaction;
  }

  async resolveDispute(
    contractId: string,
    milestoneIndex: number,
    distributions: ChainDistribution[],
  ): Promise<ChainTxResult> {
    // Multi-release resolves a single milestone dispute:
    // `resolve-milestone-dispute` (`resolve-dispute` is single-release, 404s).
    // TW wants distributions as { address, amount } objects with a numeric
    // amount, and rejects any amount <= 0 (callers omit zero shares).
    const { unsignedTransaction } = await this.post<{
      unsignedTransaction: string;
    }>('/escrow/multi-release/resolve-milestone-dispute', {
      contractId,
      milestoneIndex: String(milestoneIndex),
      disputeResolver: this.platformAddress,
      distributions,
    });
    return this.signAndSend(unsignedTransaction);
  }

  /** Broadcast a signed XDR (from a self-custodial wallet) through TW. */
  async submitSigned(signedXdr: string): Promise<string> {
    const result = await this.post<Record<string, unknown>>(
      '/helper/send-transaction',
      { signedXdr },
    );
    const fromResponse =
      (result.hash as string | undefined) ??
      (result.txHash as string | undefined);
    if (fromResponse) return fromResponse;
    try {
      return TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase)
        .hash()
        .toString('hex');
    } catch {
      return '';
    }
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
