import {
  BarChart3,
  Banknote,
  Bell,
  FileText,
  LayoutDashboard,
  Scale,
  User,
} from 'lucide-react';

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
