import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui';

export const INVITE_TOKEN_KEY = 'bolpay.invitationToken';

/**
 * Landing for the invitation link sent via Resend (/accept-invite?token=...).
 * Stashes the token so the login flow can attach it on first registration,
 * then sends the user to sign in.
 */
export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');

  useEffect(() => {
    if (token) localStorage.setItem(INVITE_TOKEN_KEY, token);
  }, [token]);

  return (
    <div className="login-screen">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <p className="login-card__logo" style={{ justifyContent: 'center' }}>
          <img src="/logo.png" alt="" />
          Bol<span>Pay</span>
        </p>
        <h2 style={{ marginBottom: 8 }}>You've been invited to BolPay</h2>
        <p className="muted" style={{ marginBottom: 20 }}>
          {token
            ? 'Sign in to accept your invitation and create your account. We will apply the invitation automatically.'
            : 'The invitation link is invalid or incomplete.'}
        </p>
        <Button disabled={!token} onClick={() => navigate('/login')}>
          Continue to sign in
        </Button>
      </div>
    </div>
  );
}
