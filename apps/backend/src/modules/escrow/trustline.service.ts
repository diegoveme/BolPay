import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Asset,
  BASE_FEE,
  Horizon,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

/**
 * USDC trustline helper. A Stellar account cannot hold or receive USDC without
 * a trustline to the USDC issuer, so wallets (Pollar or self-custodial) need it
 * before they can fund or receive escrow payments. This builds the changeTrust
 * transaction the wallet signs, checks status, and broadcasts the signed result.
 */
@Injectable()
export class TrustlineService {
  private readonly logger = new Logger(TrustlineService.name);
  private readonly isTestnet: boolean;
  private readonly usdcIssuer: string;
  private readonly networkPassphrase: string;
  private readonly server: Horizon.Server;

  constructor(config: ConfigService) {
    this.isTestnet = config.get<string>('stellar.network') !== 'mainnet';
    this.usdcIssuer = config.get<string>('stellar.usdcIssuer')!;
    this.networkPassphrase = this.isTestnet
      ? Networks.TESTNET
      : Networks.PUBLIC;
    this.server = new Horizon.Server(
      this.isTestnet
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org',
    );
  }

  private get usdc(): Asset {
    return new Asset('USDC', this.usdcIssuer);
  }

  /** Whether the account exists on-chain and already trusts USDC. */
  async status(
    address: string,
  ): Promise<{ funded: boolean; hasTrustline: boolean }> {
    try {
      const account = await this.server.loadAccount(address);
      const hasTrustline = account.balances.some(
        (b) =>
          'asset_code' in b &&
          b.asset_code === 'USDC' &&
          b.asset_issuer === this.usdcIssuer,
      );
      return { funded: true, hasTrustline };
    } catch {
      return { funded: false, hasTrustline: false };
    }
  }

  /**
   * Build the unsigned changeTrust(USDC) transaction for the wallet to sign.
   * On testnet, an unfunded account is auto-funded with friendbot first (a
   * trustline needs 0.5 XLM reserve).
   */
  async prepare(address: string): Promise<{ unsignedXdr: string }> {
    let account = await this.loadOrFund(address);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(Operation.changeTrust({ asset: this.usdc }))
      .setTimeout(180)
      .build();
    return { unsignedXdr: tx.toXDR() };
  }

  /** Broadcast a signed changeTrust (classic tx) to Horizon. */
  async submit(signedXdr: string): Promise<{ txHash: string }> {
    const tx = TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);
    try {
      const res = await this.server.submitTransaction(tx);
      return { txHash: res.hash };
    } catch (error) {
      this.logger.warn(`Trustline submit failed: ${String(error)}`);
      throw new BadRequestException('Could not activate the USDC trustline');
    }
  }

  private async loadOrFund(address: string) {
    try {
      return await this.server.loadAccount(address);
    } catch {
      if (!this.isTestnet) {
        throw new BadRequestException(
          'The account is not funded with XLM (a reserve is required for the trustline)',
        );
      }
      await fetch(`https://friendbot.stellar.org?addr=${address}`);
      return this.server.loadAccount(address);
    }
  }
}
