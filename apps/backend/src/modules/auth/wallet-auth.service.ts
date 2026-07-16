import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import {
  Account,
  BASE_FEE,
  type FeeBumpTransaction,
  Keypair,
  Networks,
  Operation,
  type Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DATA_NAME = 'BolPay auth';
// Hard cap on outstanding challenges so spraying random addresses to the public
// /auth/wallet-challenge endpoint cannot exhaust memory. When exceeded, the
// oldest inserted entry is evicted (insertion order == Map iteration order).
const MAX_PENDING = 10000;

interface PendingChallenge {
  nonce: string;
  expiresAt: number;
}

/**
 * Self-custodial wallet login (Stellar Wallets Kit: Freighter, Albedo, xBull,
 * Lobstr, Ledger…). Independent of Pollar.
 *
 * Pollar proves wallet ownership server-side through its secret key; a wallet
 * the user holds themselves has no such backchannel, so we use a SEP-10-style
 * challenge: the server issues an unsigned "auth" transaction carrying a
 * one-time nonce, the wallet signs it, and we verify the signature against the
 * claimed G-address. The transaction is NEVER submitted - it only proves the
 * user controls the secret key behind that public key.
 */
@Injectable()
export class WalletAuthService {
  private readonly logger = new Logger(WalletAuthService.name);
  private readonly networkPassphrase: string;
  // address -> pending challenge. In-memory + short TTL is enough for a single
  // instance; move to Redis/DB if the API is ever horizontally scaled.
  private readonly pending = new Map<string, PendingChallenge>();

  constructor(config: ConfigService) {
    this.networkPassphrase =
      config.get<string>('stellar.network') === 'mainnet'
        ? Networks.PUBLIC
        : Networks.TESTNET;
  }

  /** Build an unsigned challenge transaction the wallet must sign. */
  issueChallenge(stellarAddress: string): { xdr: string } {
    try {
      Keypair.fromPublicKey(stellarAddress);
    } catch {
      throw new BadRequestException('Invalid Stellar address');
    }

    // Drop expired challenges (lazy TTL is otherwise only applied on read) and
    // enforce the size cap before inserting a new one.
    this.sweepExpired();
    if (this.pending.size >= MAX_PENDING) {
      const [oldest] = this.pending.keys();
      if (oldest !== undefined) this.pending.delete(oldest);
    }

    const nonce = randomBytes(24).toString('hex'); // 48 chars (≤ 64-byte data limit)
    // Sequence is irrelevant: the tx is never submitted, only signed/verified.
    const account = new Account(stellarAddress, '0');
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(Operation.manageData({ name: DATA_NAME, value: nonce }))
      .setTimeout(Math.floor(CHALLENGE_TTL_MS / 1000))
      .build();

    this.pending.set(stellarAddress, {
      nonce,
      expiresAt: Date.now() + CHALLENGE_TTL_MS,
    });
    return { xdr: tx.toXDR() };
  }

  /**
   * Verify a signed challenge. Returns true only when the submitted transaction
   * is the one we issued for this address (matching nonce, not expired) and is
   * signed by the address's secret key.
   *
   * The challenge stays valid until it expires (it is not consumed on success)
   * so the first-login registration form can re-submit it without a second
   * wallet prompt. It is bound to one address and one nonce; replay within the
   * TTL window is only possible for the legitimate key holder.
   */
  verify(stellarAddress: string, signedXdr: string): boolean {
    const challenge = this.pending.get(stellarAddress);
    if (!challenge) return false;
    if (challenge.expiresAt < Date.now()) {
      this.pending.delete(stellarAddress);
      return false;
    }

    let tx: Transaction | FeeBumpTransaction;
    try {
      tx = TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);
    } catch {
      return false;
    }

    // Plain transaction (reject fee-bump wrappers) from the claimed source,
    // carrying our exact nonce in the first (and only) manageData operation.
    if ('innerTransaction' in tx) return false;
    if (tx.source !== stellarAddress) return false;
    const op = tx.operations[0];
    if (!op || op.type !== 'manageData' || op.name !== DATA_NAME) return false;
    if ((op.value ? op.value.toString('utf8') : '') !== challenge.nonce) {
      return false;
    }

    // Signed by the secret key behind the claimed public key.
    const keypair = Keypair.fromPublicKey(stellarAddress);
    const hash = tx.hash();
    return tx.signatures.some((sig) => {
      try {
        return keypair.verify(hash, sig.signature());
      } catch {
        return false;
      }
    });
  }

  /**
   * Invalidate the pending challenge for an address. Called by the auth flow
   * only AFTER a fully successful login, so a captured signed challenge cannot
   * be replayed once it has been used. verify() intentionally does NOT consume,
   * so the two-step registration (which re-submits the same signed XDR) still
   * verifies on the second call.
   */
  consume(stellarAddress: string): void {
    this.pending.delete(stellarAddress);
  }

  /** Delete every challenge past its TTL. */
  private sweepExpired(): void {
    const now = Date.now();
    for (const [address, challenge] of this.pending) {
      if (challenge.expiresAt < now) this.pending.delete(address);
    }
  }
}
