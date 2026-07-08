import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { usePollar } from '@pollar/react';
import { useQuery } from '@tanstack/react-query';
import { Bell, LogOut } from 'lucide-react';
import type { Notification } from '@bolpay/shared';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/lib/api';
import { roleLabel, shortAddress } from '@/lib/format';
import { Button } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TrustlineBanner } from '@/components/TrustlineBanner';
import { NAV_BY_ROLE } from './AppLayout.nav';
import { VerifyEmailBanner } from './VerifyEmailBanner';

/**
 * Authenticated app shell: role-based sidebar navigation, top bar with wallet
 * shortcut and unread notifications bell, and the routed page outlet.
 */
export function AppLayout() {
  const { user, logout, refreshUser } = useAuth();
  const pollar = usePollar();
  const navigate = useNavigate();

  // The stored session is a snapshot from login: emailVerified can change later
  // (the user opens the verification link, usually in another tab). Re-sync from
  // /auth/me on mount and whenever the tab regains focus so the verify banner
  // clears on its own once the email is confirmed.
  useEffect(() => {
    void refreshUser();
    const onFocus = () => void refreshUser();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshUser]);

  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () =>
      (await api.get<Notification[]>('/notifications', { params: { unread: true } }))
        .data,
    refetchInterval: 60_000,
  });

  if (!user) return null;
  const nav = NAV_BY_ROLE[user.role];
  const unreadCount = unread?.length ?? 0;

  return (
    <div className="shell">
      <aside className="sidebar">
        <p className="sidebar__brand">
          <img src="/logo.png" alt="" />
          Bol<span>Pay</span>
        </p>
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `sidebar__link${isActive ? ' active' : ''}`
              }
            >
              <Icon size={17} strokeWidth={2} aria-hidden />
              {item.label}
            </NavLink>
          );
        })}
        <div className="sidebar__footer">
          <p>{user.name ?? user.email}</p>
          <p>{roleLabel[user.role]}</p>
          <Button
            variant="ghost"
            style={{ paddingLeft: 0, color: 'var(--primary)' }}
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Log out
          </Button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          {pollar.isAuthenticated && pollar.walletAddress && (
            <button
              type="button"
              className="topbar__wallet"
              title="View wallet balance"
              onClick={() => pollar.openWalletBalanceModal()}
            >
              ◈ {shortAddress(pollar.walletAddress)}
            </button>
          )}
          <ThemeToggle />
          <button
            type="button"
            className="topbar__bell"
            aria-label="Notifications"
            onClick={() => navigate('/notifications')}
          >
            <Bell size={18} aria-hidden />
            {unreadCount > 0 && (
              <span className="topbar__bell-dot">{Math.min(unreadCount, 99)}</span>
            )}
          </button>
          <button
            type="button"
            className="topbar__bell topbar__logout"
            aria-label="Log out"
            title="Log out"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <LogOut size={18} aria-hidden />
          </button>
        </header>
        <main className="content">
          {!user.emailVerified && <VerifyEmailBanner />}
          {user.stellarAddress && (
            <TrustlineBanner address={user.stellarAddress} />
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
