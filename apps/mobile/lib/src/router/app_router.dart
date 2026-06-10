import 'package:go_router/go_router.dart';

import '../features/auth/login_screen.dart';
import '../features/contracts/contract_detail_screen.dart';
import '../features/contracts/contracts_screen.dart';
import '../features/home/home_screen.dart';
import '../features/notifications/notifications_screen.dart';
import '../features/profile/profile_screen.dart';
import '../state/auth_state.dart';

/// Crea el router de la app con redirect según sesión.
///
/// Sin token → /login. Con sesión, /login redirige a /contracts.
GoRouter createAppRouter(AuthState auth) {
  return GoRouter(
    initialLocation: '/contracts',
    refreshListenable: auth,
    redirect: (context, state) {
      final loggedIn = auth.isAuthenticated;
      final goingToLogin = state.matchedLocation == '/login';
      if (!loggedIn && !goingToLogin) return '/login';
      if (loggedIn && goingToLogin) return '/contracts';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            HomeShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/contracts',
                builder: (context, state) => const ContractsScreen(),
                routes: [
                  GoRoute(
                    path: ':id',
                    builder: (context, state) => ContractDetailScreen(
                      contractId: state.pathParameters['id']!,
                    ),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/notifications',
                builder: (context, state) => const NotificationsScreen(),
              ),
            ],
          ),
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
