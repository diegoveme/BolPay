import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PollarWallet {
  id: string;
  address: string;
  status: 'pending' | 'active';
  balances?: { asset: string; amount: string }[];
}

/**
 * Minimal client for the Pollar Server API (https://docs.pollar.xyz).
 * Privileged endpoints require the secret key (sec_testnet_/sec_mainnet_);
 * when it is not configured (local development with only the publishable key
 * on the clients) lookups resolve to null and callers skip verification.
 */
@Injectable()
export class PollarService {
  private readonly logger = new Logger(PollarService.name);
  private readonly baseUrl: string;
  private readonly secretKey: string;

  constructor(config: ConfigService) {
    this.baseUrl =
      config.get<string>('pollar.apiUrl') ?? 'https://api.pollar.xyz';
    this.secretKey = config.get<string>('pollar.secretKey') ?? '';

    // Fail at boot, not at login time: production must never run with
    // server-side wallet verification disabled.
    if (config.get<string>('nodeEnv') === 'production' && !this.secretKey) {
      throw new Error('POLLAR_SECRET_KEY is required in production');
    }
    if (!this.secretKey) {
      this.logger.warn(
        'POLLAR_SECRET_KEY not set — wallet ownership verification is DISABLED (development only)',
      );
    }
  }

  get isConfigured(): boolean {
    return this.secretKey.length > 0;
  }

  /** GET /wallets/:walletId — wallet details and balances. */
  async getWallet(walletId: string): Promise<PollarWallet | null> {
    if (!this.isConfigured) return null;
    const response = await fetch(`${this.baseUrl}/wallets/${walletId}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });
    if (!response.ok) {
      this.logger.warn(`Pollar getWallet(${walletId}) → ${response.status}`);
      return null;
    }
    return (await response.json()) as PollarWallet;
  }

  /**
   * Verify that a Pollar wallet id belongs to the claimed Stellar address.
   *
   * Fails CLOSED whenever the secret key is configured: a missing wallet id,
   * an unreachable Pollar server or an address mismatch all reject the login.
   * Only when the secret key is absent (local development — production boots
   * refuse to start without it) is verification skipped.
   *
   * Known limitation, documented on purpose: Pollar's public API does not yet
   * expose a backend-verifiable identity token (ID token + JWKS), so the
   * strongest available binding is wallet-id ↔ address via the secret key.
   */
  async verifyWallet(
    pollarWalletId: string | undefined,
    stellarAddress: string,
  ): Promise<boolean> {
    if (!this.isConfigured) return true; // dev only — see boot check
    if (!pollarWalletId) return false;
    const wallet = await this.getWallet(pollarWalletId);
    if (!wallet) return false;
    return wallet.address === stellarAddress;
  }

  /**
   * POST /wallets/activate — fund the XLM reserve (Deferred funding mode).
   * 409 (already active) is treated as success, as documented by Pollar.
   */
  async activateWallet(walletId: string): Promise<boolean> {
    if (!this.isConfigured) return false;
    const response = await fetch(`${this.baseUrl}/wallets/activate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletId }),
    });
    if (response.ok || response.status === 409) return true;
    this.logger.warn(`Pollar activateWallet(${walletId}) → ${response.status}`);
    return false;
  }
}
