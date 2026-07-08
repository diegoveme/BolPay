import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePollar } from '@pollar/react';
import { AuthProvider as AuthProviderEnum, UserRole } from '@bolpay/shared';
import type { AuthProvider as AuthProviderType, LoginRequest } from '@bolpay/shared';
import { useAuth } from '@/auth/AuthContext';
import { api, apiErrorMessage } from '@/lib/api';
import {
  clearWalletSource,
  ensureWalletKit,
  setWalletSource,
  WALLET_NETWORK_PASSPHRASE,
} from '@/lib/walletKit';
import { shortAddress } from '@/lib/format';
import { Button, Field, SelectField } from '@/components/ui';
import { INVITE_TOKEN_KEY } from '@/routes/AcceptInvitePage';

/** A self-custodial wallet connected through Stellar Wallets Kit. */
interface WalletKitIdentity {
  address: string;
  /** Signed challenge transaction (XDR) proving ownership of `address`. */
  authXdr: string;
}

/**
 * Two-step login with two independent wallet paths:
 *  1a. Pollar (publishable key, client-side): email OTP / OAuth + custodial
 *      Stellar wallet - for people without any crypto wallet.
 *  1b. Stellar Wallets Kit: connect an existing wallet (Freighter, Albedo,
 *      xBull, Lobstr…) and sign a server challenge to prove ownership - for
 *      people who already have crypto.
 *  2.  Exchange that identity for a BolPay session (POST /auth/login). On first
 *      login the backend requires a role, so we show a small registration form.
 */
export function LoginPage() {
  const pollar = usePollar();
  const { session, loginToBackend } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [swk, setSwk] = useState<WalletKitIdentity | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.Freelancer);
  const [invitationToken, setInvitationToken] = useState(
    () => localStorage.getItem(INVITE_TOKEN_KEY) ?? '',
  );
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Pollar keeps PII in memory only; prefill what it knows about the user.
  const profile = useMemo(() => {
    if (!pollar.isAuthenticated) return null;
    try {
      return pollar.getClient().getUserProfile();
    } catch {
      return null;
    }
  }, [pollar]);

  const detectedProvider: AuthProviderType = useMemo(() => {
    if (profile?.providers?.google) return AuthProviderEnum.Google;
    if (profile?.providers?.github) return AuthProviderEnum.Github;
    if (profile?.providers?.wallet) return AuthProviderEnum.Wallet;
    return AuthProviderEnum.Email;
  }, [profile]);

  // Identity currently connected, from whichever path.
  const connectedAddress = swk?.address ?? pollar.walletAddress ?? null;
  const walletConnected = !!swk || pollar.isAuthenticated;

  useEffect(() => {
    if (profile?.mail && !email) setEmail(profile.mail);
    if (profile && !name) {
      const fullName = [profile.first_name, profile.last_name]
        .filter(Boolean)
        .join(' ');
      if (fullName) setName(fullName);
    }
  }, [profile, email, name]);

  // Already holding a BolPay session → straight to the app.
  useEffect(() => {
    if (session) navigate(from, { replace: true });
  }, [session, navigate, from]);

  async function exchange(extra?: Partial<LoginRequest>) {
    if (!connectedAddress) return;
    setSubmitting(true);
    setError('');
    try {
      const payload: LoginRequest = {
        provider: swk ? AuthProviderEnum.Wallet : detectedProvider,
        stellarAddress: connectedAddress,
        email: email.trim().toLowerCase() || undefined,
        name: name.trim() || undefined,
        walletAuthXdr: swk?.authXdr,
        // Carry the invitation token from the first attempt so an invited
        // (pre-created) account can be claimed without a second round-trip.
        invitationToken: invitationToken.trim() || undefined,
        ...extra,
      };
      await loginToBackend(payload);
      // Remember how this session signs escrow actions (Pollar vs own wallet).
      setWalletSource(swk ? 'swk' : 'pollar');
      localStorage.removeItem(INVITE_TOKEN_KEY);
      navigate(from, { replace: true });
    } catch (err) {
      const message = apiErrorMessage(err);
      if (
        message.includes('role is required') ||
        message.includes('email is required')
      ) {
        // First-time account: ask for role (and email if we don't have one).
        setNeedsRegistration(true);
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Connect an existing wallet via Stellar Wallets Kit and prove ownership by
  // signing the server's challenge. Independent of Pollar.
  async function connectWalletKit() {
    setError('');
    setConnecting(true);
    try {
      const kit = ensureWalletKit();
      const { address } = await kit.authModal();
      const { data } = await api.post<{ xdr: string }>('/auth/wallet-challenge', {
        stellarAddress: address,
      });
      const { signedTxXdr } = await kit.signTransaction(data.xdr, {
        address,
        networkPassphrase: WALLET_NETWORK_PASSPHRASE,
      });
      setSwk({ address, authXdr: signedTxXdr });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setConnecting(false);
    }
  }

  function resetWallet() {
    setSwk(null);
    setNeedsRegistration(false);
    setEmail('');
    clearWalletSource();
    try {
      pollar.logout();
    } catch {
      /* pollar session may already be gone */
    }
    try {
      ensureWalletKit().disconnect();
    } catch {
      /* no wallet kit session */
    }
  }

  // Once Pollar authenticates and we know the wallet, try the silent exchange.
  useEffect(() => {
    if (
      pollar.isAuthenticated &&
      pollar.walletAddress &&
      !swk &&
      !needsRegistration &&
      !session &&
      !submitting
    ) {
      void exchange();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollar.isAuthenticated, pollar.walletAddress]);

  // Once a self-custodial wallet connects + signs, try the silent exchange.
  useEffect(() => {
    if (swk && !needsRegistration && !session && !submitting) {
      void exchange();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swk]);

  return (
    <div className="login-screen">
      <div className="login-card">
        <p className="login-card__logo">
          <img src="/logo.png" alt="" />
          Bol<span>Pay</span>
        </p>
        <p className="login-card__tag">
          Freelance contracts, decentralized escrow on Stellar, and USDC payroll.
        </p>

        {!walletConnected && (
          <>
            <Button
              onClick={() => pollar.openLoginModal()}
              style={{ width: '100%' }}
            >
              Continue with Pollar
            </Button>
            <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
              This option creates and custodies your Stellar wallet and lets you
              sign in with an email code, no seed phrases or extensions. Ideal if
              you have no crypto.
            </p>

            <div className="login-divider">
              <span>or</span>
            </div>

            <Button
              variant="ghost"
              onClick={() => void connectWalletKit()}
              loading={connecting}
              style={{ width: '100%' }}
            >
              Connect my wallet
            </Button>
            <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
              Already have a Stellar wallet (Freighter, Albedo, xBull, Lobstr…)?
              Connect it and sign to enter; you keep custody of your funds.
            </p>
          </>
        )}

        {walletConnected && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void exchange(
                needsRegistration
                  ? {
                      role,
                      invitationToken: invitationToken.trim() || undefined,
                    }
                  : {},
              );
            }}
          >
            <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
              Wallet connected:{' '}
              <span className="mono">{shortAddress(connectedAddress ?? '')}</span>
              {swk && ' · signed with your wallet'}
            </p>

            <Field
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />

            {needsRegistration && (
              <>
                <Field
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name or your company's"
                />
                <SelectField
                  label="I want to use BolPay as"
                  value={role}
                  onChange={(value) => setRole(value as UserRole)}
                  options={[
                    { value: UserRole.Freelancer, label: 'Freelancer' },
                    { value: UserRole.Company, label: 'Company' },
                    { value: UserRole.FixedEmployee, label: 'Fixed employee' },
                  ]}
                />
                <Field
                  label="Invitation code (optional)"
                  value={invitationToken}
                  onChange={(e) => setInvitationToken(e.target.value)}
                  hint="If you were invited by email, paste the code here"
                />
              </>
            )}

            {error && <p className="field__error">{error}</p>}

            <div className="row" style={{ marginTop: 10 }}>
              <Button type="submit" loading={submitting}>
                {needsRegistration ? 'Create account' : 'Sign in'}
              </Button>
              <Button type="button" variant="ghost" onClick={resetWallet}>
                Switch account
              </Button>
            </div>
          </form>
        )}

        {!walletConnected && error && (
          <p className="field__error" style={{ marginTop: 14 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
