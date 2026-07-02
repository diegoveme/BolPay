import { createBrowserRouter } from 'react-router-dom';
import { RequireAuth, RequireRole } from '@/auth/RequireAuth';
import { AppLayout } from '@/routes/AppLayout';
import { LandingPage } from '@/routes/landing/LandingPage';
import { LoginPage } from '@/routes/LoginPage';
import { VerifyEmailPage } from '@/routes/VerifyEmailPage';
import { AcceptInvitePage } from '@/routes/AcceptInvitePage';
import { DashboardPage } from '@/routes/DashboardPage';
import { ContractsPage } from '@/routes/contracts/ContractsPage';
import { ContractDetailPage } from '@/routes/contracts/ContractDetailPage';
import { ContractFormPage } from '@/routes/contracts/ContractFormPage';
import { PayrollsPage } from '@/routes/payroll/PayrollsPage';
import { PayrollDetailPage } from '@/routes/payroll/PayrollDetailPage';
import { PayrollFormPage } from '@/routes/payroll/PayrollFormPage';
import { DisputesPage } from '@/routes/disputes/DisputesPage';
import { DisputeDetailPage } from '@/routes/disputes/DisputeDetailPage';
import { NotificationsPage } from '@/routes/NotificationsPage';
import { ProfilePage } from '@/routes/ProfilePage';
import { AdminPage } from '@/routes/admin/AdminPage';

export const router = createBrowserRouter([
  { path: '/landing', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  { path: '/accept-invite', element: <AcceptInvitePage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'contracts', element: <ContractsPage /> },
          { path: 'contracts/:id', element: <ContractDetailPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'disputes', element: <DisputesPage /> },
          { path: 'disputes/:id', element: <DisputeDetailPage /> },
          {
            element: <RequireRole roles={['company']} />,
            children: [
              { path: 'contracts/new', element: <ContractFormPage /> },
              { path: 'contracts/:id/edit', element: <ContractFormPage /> },
              { path: 'payrolls', element: <PayrollsPage /> },
              { path: 'payrolls/new', element: <PayrollFormPage /> },
              { path: 'payrolls/:id', element: <PayrollDetailPage /> },
              { path: 'payrolls/:id/edit', element: <PayrollFormPage /> },
            ],
          },
          {
            element: <RequireRole roles={['administrator']} />,
            children: [{ path: 'admin', element: <AdminPage /> }],
          },
        ],
      },
    ],
  },
]);
