import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from '@/routes/RootLayout';
import { HomePage } from '@/routes/HomePage';
import { DashboardPage } from '@/routes/DashboardPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'dashboard', element: <DashboardPage /> },
    ],
  },
]);
