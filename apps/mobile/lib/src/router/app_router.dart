import 'package:go_router/go_router.dart';

import '../features/admin/admin_screen.dart';
import '../features/auth/accept_invite_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/verify_email_screen.dart';
import '../features/contracts/contract_detail_screen.dart';
import '../features/contracts/contract_form_screen.dart';
import '../features/contracts/contracts_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/disputes/dispute_detail_screen.dart';
import '../features/disputes/disputes_screen.dart';
import '../features/home/home_screen.dart';
import '../features/notifications/notifications_screen.dart';
import '../features/payrolls/payroll_detail_screen.dart';
import '../features/payrolls/payroll_form_screen.dart';
import '../features/payrolls/payrolls_screen.dart';
import '../features/profile/profile_screen.dart';
import '../state/auth_state.dart';

const _publicPaths = {'/login', '/verify-email', '/accept-invite'};

/// True for routes gated to company users (administrator always passes,
/// like the web RequireRole).
bool _isCompanyOnly(String location) {
  if (location.startsWith('/payrolls')) return true;
  if (location == '/contracts/new') return true;
  if (location.startsWith('/contracts/') && location.endsWith('/edit')) {
    return true;
  }
  return false;
}

/// Creates the app router: public auth routes plus the authed shell with
/// role-aware redirects.
///
/// Without a token everything redirects to /login. Company-only routes
/// (payroll, contract create/edit) and the admin route bounce other
/// roles back to /dashboard.
GoRouter createAppRouter(AuthState auth) {
  return GoRouter(
    initialLocation: '/dashboard',
    refreshListenable: auth,
    redirect: (context, state) {
      final loggedIn = auth.isAuthenticated;
      final location = state.matchedLocation;
      final isPublic = _publicPaths.contains(location);

      if (!loggedIn) return isPublic ? null : '/login';
      if (location == '/login' || location == '/') return '/dashboard';

      final role = auth.user?.role;
      // Role gates only apply once the user is loaded; administrator
      // passes every company gate.
      if (role != null) {
        final isAdmin = role == 'administrator';
        if (location.startsWith('/admin') && !isAdmin) return '/dashboard';
        if (_isCompanyOnly(location) && role != 'company' && !isAdmin) {
          return '/dashboard';
        }
      }
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/verify-email',
        builder: (context, state) =>
            VerifyEmailScreen(token: state.uri.queryParameters['token']),
      ),
      GoRoute(
        path: '/accept-invite',
        builder: (context, state) =>
            AcceptInviteScreen(token: state.uri.queryParameters['token']),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            HomeShell(navigationShell: navigationShell),
        branches: [
          // Branch 0: dashboard (index).
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/dashboard',
                builder: (context, state) => const DashboardScreen(),
              ),
            ],
          ),
          // Branch 1: contracts.
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/contracts',
                builder: (context, state) => const ContractsScreen(),
                routes: [
                  // "new" must be declared before ":id".
                  GoRoute(
                    path: 'new',
                    builder: (context, state) => const ContractFormScreen(),
                  ),
                  GoRoute(
                    path: ':id',
                    builder: (context, state) => ContractDetailScreen(
                      contractId: state.pathParameters['id']!,
                    ),
                    routes: [
                      GoRoute(
                        path: 'edit',
                        builder: (context, state) => ContractFormScreen(
                          contractId: state.pathParameters['id']!,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          // Branch 2: payroll (company; administrator passes).
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/payrolls',
                builder: (context, state) => const PayrollsScreen(),
                routes: [
                  GoRoute(
                    path: 'new',
                    builder: (context, state) => const PayrollFormScreen(),
                  ),
                  GoRoute(
                    path: ':id',
                    builder: (context, state) => PayrollDetailScreen(
                      payrollId: state.pathParameters['id']!,
                    ),
                    routes: [
                      GoRoute(
                        path: 'edit',
                        builder: (context, state) => PayrollFormScreen(
                          payrollId: state.pathParameters['id']!,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          // Branch 3: disputes.
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/disputes',
                builder: (context, state) => const DisputesScreen(),
                routes: [
                  GoRoute(
                    path: ':id',
                    builder: (context, state) => DisputeDetailScreen(
                      disputeId: state.pathParameters['id']!,
                    ),
                  ),
                ],
              ),
            ],
          ),
          // Branch 4: administration (administrator only).
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/admin',
                builder: (context, state) => const AdminScreen(),
              ),
            ],
          ),
          // Branch 5: notifications.
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/notifications',
                builder: (context, state) => const NotificationsScreen(),
              ),
            ],
          ),
          // Branch 6: profile.
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (context, state) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
}
