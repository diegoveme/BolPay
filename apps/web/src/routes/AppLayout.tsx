import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { usePollar } from '@pollar/react';
import { useQuery } from '@tanstack/react-query';
import type { Notification } from '@bolpay/shared';
import { useAuth } from '@/auth/AuthContext';
import { useNotificationsUi } from '@/notifications/NotificationsContext';
import { api } from '@/lib/api';
import { roleLabel, shortAddress } from '@/lib/format';
import { Button } from '@/components/ui';

const NAV_BY_ROLE = {
  company: [
    { to: '/', label: 'Inicio' },
    { to: '/contracts', label: 'Contratos' },
    { to: '/payrolls', label: 'Nómina' },
    { to: '/disputes', label: 'Disputas' },
    { to: '/notifications', label: 'Notificaciones' },
    { to: '/profile', label: 'Perfil' },
  ],
  freelancer: [
    { to: '/', label: 'Inicio' },
    { to: '/contracts', label: 'Contratos' },
    { to: '/disputes', label: 'Disputas' },
    { to: '/notifications', label: 'Notificaciones' },
    { to: '/profile', label: 'Perfil' },
  ],
  fixed_employee: [
    { to: '/', label: 'Inicio' },
    { to: '/notifications', label: 'Notificaciones' },
    { to: '/profile', label: 'Perfil' },
  ],
  administrator: [
    { to: '/', label: 'Inicio' },
    { to: '/contracts', label: 'Contratos' },
    { to: '/payrolls', label: 'Nómina' },
    { to: '/disputes', label: 'Disputas' },
    { to: '/admin', label: 'Administración' },
    { to: '/notifications', label: 'Notificaciones' },
    { to: '/profile', label: 'Perfil' },
  ],
} as const;

export function AppLayout() {
  const { user, logout } = useAuth();
  const pollar = usePollar();
  const navigate = useNavigate();
  const { unreadDelta } = useNotificationsUi();

  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () =>
      (await api.get<Notification[]>('/notifications', { params: { unread: true } }))
        .data,
    refetchInterval: 60_000,
  });

  if (!user) return null;
  const nav = NAV_BY_ROLE[user.role];
  const unreadCount = (unread?.length ?? 0) + unreadDelta;

  return (
    <div className="shell">
      <aside className="sidebar">
        <p className="sidebar__brand">
          Bol<span>Pay</span>
        </p>
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `sidebar__link${isActive ? ' active' : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
        <div className="sidebar__footer">
          <p style={{ fontWeight: 650, color: '#fff' }}>
            {user.name ?? user.email}
          </p>
          <p>{roleLabel[user.role]}</p>
          <Button
            variant="ghost"
            style={{ paddingLeft: 0, color: '#8fb1ff' }}
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          {pollar.isAuthenticated && pollar.walletAddress && (
            <button
              type="button"
              className="topbar__wallet"
              title="Ver saldo de la wallet (Pollar)"
              onClick={() => pollar.openWalletBalanceModal()}
            >
              ◈ {shortAddress(pollar.walletAddress)}
            </button>
          )}
          <button
            type="button"
            className="topbar__bell"
            aria-label="Notificaciones"
            onClick={() => navigate('/notifications')}
          >
            🔔
            {unreadCount > 0 && (
              <span className="topbar__bell-dot">{Math.min(unreadCount, 99)}</span>
            )}
          </button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
