/**
 * Request/response contracts for the BolPay REST API.
 * The client logs in with Pollar first (wallet + identity), then exchanges
 * that identity for a BolPay session via POST /auth/login.
 */
import type { AuthProvider, UserRole } from './enums.js';
import type { User } from './models.js';

export interface LoginRequest {
  /** Optional: returning users are identified by their wallet, not email. */
  email?: string;
  provider: AuthProvider;
  /** Stellar G-address returned by Pollar after login. */
  stellarAddress: string;
  /** Pollar wallet id (wal_...) when the SDK exposes it. */
  pollarWalletId?: string;
  /**
   * Signed challenge transaction (XDR) for self-custodial wallet login
   * (Stellar Wallets Kit). When present, the backend authenticates by verifying
   * this signature instead of going through Pollar.
   */
  walletAuthXdr?: string;
  /** Required on first login only; ignored afterwards. */
  role?: UserRole;
  name?: string;
  /** Invitation token when registering via an email invitation. */
  invitationToken?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
