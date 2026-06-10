import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePollar } from '@pollar/react';
import { AuthProvider as AuthProviderEnum, UserRole } from '@bolpay/shared';
import type { AuthProvider as AuthProviderType, LoginRequest } from '@bolpay/shared';
import { useAuth } from '@/auth/AuthContext';
import { apiErrorMessage } from '@/lib/api';
import { shortAddress } from '@/lib/format';
import { Button, Field, SelectField } from '@/components/ui';

/**
 * Two-step login:
 *  1. Pollar (publishable key, client-side): OAuth / email OTP + Stellar wallet.
 *  2. Exchange that identity for a BolPay session (POST /auth/login). On first
 *     login the backend requires a role, so we show a small registration form.
 */
export function LoginPage() {
  const pollar = usePollar();
  const { session, loginToBackend } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.Freelancer);
  const [invitationToken, setInvitationToken] = useState('');
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
    if (!pollar.walletAddress) return;
    setSubmitting(true);
    setError('');
    try {
      await loginToBackend({
        email: email.trim().toLowerCase(),
        provider: detectedProvider,
        stellarAddress: pollar.walletAddress,
        name: name.trim() || undefined,
        ...extra,
      });
      navigate(from, { replace: true });
    } catch (err) {
      const message = apiErrorMessage(err);
      if (message.includes('role is required')) {
        // First login: the backend wants to know who this user is.
        setNeedsRegistration(true);
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Once Pollar authenticates and we know the email, try the silent exchange.
  useEffect(() => {
    if (
      pollar.isAuthenticated &&
      pollar.walletAddress &&
      email &&
      !needsRegistration &&
      !session &&
      !submitting
    ) {
      void exchange();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollar.isAuthenticated, pollar.walletAddress, email]);

  return (
    <div className="login-screen">
      <div className="login-card">
        <p className="login-card__logo">
          Bol<span>Pay</span>
        </p>
        <p className="login-card__tag">
          Contratos freelance, escrow descentralizado en Stellar y nómina en USDC.
        </p>

        {!pollar.isAuthenticated && (
          <>
            <Button onClick={() => pollar.openLoginModal()} style={{ width: '100%' }}>
              Iniciar sesión con Pollar
            </Button>
            <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
              Pollar crea y custodia tu wallet Stellar: entra con Google, GitHub o
              un código por correo, sin seed phrases.
            </p>
          </>
        )}

        {pollar.isAuthenticated && (
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
              Wallet conectada:{' '}
              <span className="mono">{shortAddress(pollar.walletAddress)}</span>
            </p>

            <Field
              label="Correo electrónico"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />

            {needsRegistration && (
              <>
                <Field
                  label="Nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre o el de tu empresa"
                />
                <SelectField
                  label="Quiero usar BolPay como"
                  value={role}
                  onChange={(value) => setRole(value as UserRole)}
                  options={[
                    { value: UserRole.Freelancer, label: 'Freelancer' },
                    { value: UserRole.Company, label: 'Empresa' },
                    { value: UserRole.FixedEmployee, label: 'Empleado fijo' },
                  ]}
                />
                <Field
                  label="Código de invitación (opcional)"
                  value={invitationToken}
                  onChange={(e) => setInvitationToken(e.target.value)}
                  hint="Si te invitaron por correo, pega aquí el código"
                />
              </>
            )}

            {error && <p className="field__error">{error}</p>}

            <div className="row" style={{ marginTop: 10 }}>
              <Button type="submit" loading={submitting}>
                {needsRegistration ? 'Crear cuenta' : 'Entrar'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  pollar.logout();
                  setNeedsRegistration(false);
                  setEmail('');
                }}
              >
                Cambiar de cuenta
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
