import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, apiErrorMessage } from '@/lib/api';
import { Button, Spinner } from '@/components/ui';

type State = 'verifying' | 'success' | 'error';

/**
 * Landing for the email-verification link sent via Resend
 * (/verify-email?token=...). Confirms the token against the backend.
 */
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<State>('verifying');
  const [error, setError] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) {
      setState('error');
      setError('The verification token is missing from the link.');
      return;
    }
    api
      .post('/auth/verify-email', { token })
      .then(() => setState('success'))
      .catch((err) => {
        setState('error');
        setError(apiErrorMessage(err));
      });
  }, [token]);

  return (
    <div className="login-screen">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <p className="login-card__logo" style={{ justifyContent: 'center' }}>
          <img src="/logo.png" alt="" />
          Bol<span>Pay</span>
        </p>

        {state === 'verifying' && <Spinner label="Verifying your email…" />}

        {state === 'success' && (
          <>
            <h2 style={{ marginBottom: 8 }}>Email verified</h2>
            <p className="muted" style={{ marginBottom: 20 }}>
              Your email is confirmed. You can now use BolPay as usual.
            </p>
            <Link to="/login">
              <Button>Go to sign in</Button>
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <h2 style={{ marginBottom: 8 }}>We couldn't verify it</h2>
            <p className="muted" style={{ marginBottom: 20 }}>{error}</p>
            <Link to="/login">
              <Button variant="secondary">Back to sign in</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
