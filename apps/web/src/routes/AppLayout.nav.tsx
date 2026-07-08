import { useState } from 'react';
import {
  BarChart3,
  Banknote,
  Bell,
  Check,
  FileText,
  LayoutDashboard,
  Scale,
  User,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui';

/** Role-based sidebar navigation entries (with icon) keyed by the user's role. */
export const NAV_BY_ROLE = {
  company: [
    { to: '/', label: 'Home', icon: LayoutDashboard },
    { to: '/contracts', label: 'Contracts', icon: FileText },
    { to: '/payrolls', label: 'Payroll', icon: Banknote },
    { to: '/disputes', label: 'Disputes', icon: Scale },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/profile', label: 'Profile', icon: User },
  ],
  freelancer: [
    { to: '/', label: 'Home', icon: LayoutDashboard },
    { to: '/contracts', label: 'Contracts', icon: FileText },
    { to: '/disputes', label: 'Disputes', icon: Scale },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/profile', label: 'Profile', icon: User },
  ],
  fixed_employee: [
    { to: '/', label: 'Home', icon: LayoutDashboard },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/profile', label: 'Profile', icon: User },
  ],
  // Admin is a supervisor, not an operator: it only observes (the Administration
  // panel) and manages its own account. No contract/payroll/dispute action pages.
  administrator: [
    { to: '/', label: 'Home', icon: LayoutDashboard },
    { to: '/admin', label: 'Administration', icon: BarChart3 },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/profile', label: 'Profile', icon: User },
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
