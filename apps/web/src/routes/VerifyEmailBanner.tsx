import { useState } from 'react';
import { Check } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui';

/** Reminder shown until the user confirms their email (gates sensitive actions). */
export function VerifyEmailBanner() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  async function resend() {
    setState('sending');
    try {
      await api.post('/auth/resend-verification');
      setState('sent');
    } catch {
      setState('idle');
    }
  }
  return (
    <div className="verify-banner">
      <span>Verify your email to enable invitations and escrow funding.</span>
      {state === 'sent' ? (
        <span className="row" style={{ gap: 6 }}>
          Verification email sent <Check size={15} />
        </span>
      ) : (
        <Button variant="ghost" onClick={resend} loading={state === 'sending'}>
          Resend verification
        </Button>
      )}
    </div>
  );
}
