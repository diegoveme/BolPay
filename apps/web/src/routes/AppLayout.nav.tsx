import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui';

/** Role-based sidebar navigation entries keyed by the user's role. */
export const NAV_BY_ROLE = {
  company: [
    { to: '/', label: 'Home' },
    { to: '/contracts', label: 'Contracts' },
    { to: '/payrolls', label: 'Payroll' },
    { to: '/disputes', label: 'Disputes' },
    { to: '/notifications', label: 'Notifications' },
    { to: '/profile', label: 'Profile' },
  ],
  freelancer: [
    { to: '/', label: 'Home' },
    { to: '/contracts', label: 'Contracts' },
    { to: '/disputes', label: 'Disputes' },
    { to: '/notifications', label: 'Notifications' },
    { to: '/profile', label: 'Profile' },
  ],
  fixed_employee: [
    { to: '/', label: 'Home' },
    { to: '/notifications', label: 'Notifications' },
    { to: '/profile', label: 'Profile' },
  ],
  administrator: [
    { to: '/', label: 'Home' },
    { to: '/contracts', label: 'Contracts' },
    { to: '/payrolls', label: 'Payroll' },
    { to: '/disputes', label: 'Disputes' },
    { to: '/admin', label: 'Administration' },
    { to: '/notifications', label: 'Notifications' },
    { to: '/profile', label: 'Profile' },
  ],
} as const;

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
      <span>
        Verify your email to enable invitations and escrow funding.
      </span>
      {state === 'sent' ? (
        <span>Verification email sent ✓</span>
      ) : (
        <Button variant="ghost" onClick={resend} loading={state === 'sending'}>
          Resend verification
        </Button>
      )}
    </div>
  );
}
