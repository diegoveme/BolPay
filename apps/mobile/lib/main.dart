import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'src/core/api_client.dart';
import 'src/core/api_config.dart';
import 'src/core/app_scope.dart';
import 'src/core/theme_controller.dart';
import 'src/core/token_storage.dart';
import 'src/data/activity_repository.dart';
import 'src/data/auth_repository.dart';
import 'src/data/contracts_repository.dart';
import 'src/data/disputes_repository.dart';
import 'src/data/escrow_repository.dart';
import 'src/data/metrics_repository.dart';
import 'src/data/milestones_repository.dart';
import 'src/data/notifications_repository.dart';
import 'src/data/payroll_repository.dart';
import 'src/data/pollar_client.dart';
import 'src/data/users_repository.dart';
import 'src/router/app_router.dart';
import 'src/state/auth_state.dart';
import 'src/ui/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Fail closed: a release build must talk to the backend over HTTPS. This
  // turns a misconfigured API_URL into a clear startup error instead of a
  // silent cleartext call. Debug/profile keep http://10.0.2.2 for the
  // emulator loopback.
  if (kReleaseMode && !ApiConfig.baseUrl.startsWith('https://')) {
    throw StateError(
      'Insecure API_URL in a release build: "${ApiConfig.baseUrl}". '
      'Rebuild with --dart-define=API_URL=https://your-backend/api.',
    );
  }

  final storage = TokenStorage();
  final apiClient = ApiClient(tokenProvider: storage.readToken);
  final pollar = PollarClient(storage: storage);
  final auth = AuthState(
    repository: AuthRepository(apiClient),
    storage: storage,
    pollar: pollar,
  );
  final theme = ThemeController();
  await Future.wait([auth.restore(), theme.restore()]);

  runApp(
    BolPayApp(
      auth: auth,
      storage: storage,
      apiClient: apiClient,
      pollar: pollar,
      theme: theme,
    ),
  );
}

/// Root widget: wires the repositories into [AppScope] and applies the
/// Andean Precision light and dark themes.
class BolPayApp extends StatefulWidget {
  const BolPayApp({
    super.key,
    required this.auth,
    required this.storage,
    required this.apiClient,
    required this.pollar,
    required this.theme,
  });

  final AuthState auth;
  final TokenStorage storage;
  final ApiClient apiClient;
  final PollarClient pollar;
  final ThemeController theme;

  @override
  State<BolPayApp> createState() => _BolPayAppState();
}

class _BolPayAppState extends State<BolPayApp> {
  late final GoRouter _router = createAppRouter(widget.auth);
  late final _users = UsersRepository(widget.apiClient);
  late final _contracts = ContractsRepository(widget.apiClient);
  late final _milestones = MilestonesRepository(widget.apiClient);
  late final _escrows = EscrowRepository(widget.apiClient);
  late final _payrolls = PayrollRepository(widget.apiClient);
  late final _disputes = DisputesRepository(widget.apiClient);
  late final _notifications = NotificationsRepository(widget.apiClient);
  late final _activity = ActivityRepository(widget.apiClient);
  late final _metrics = MetricsRepository(widget.apiClient);

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AppScope(
      auth: widget.auth,
      storage: widget.storage,
      users: _users,
      contracts: _contracts,
      milestones: _milestones,
      escrows: _escrows,
      payrolls: _payrolls,
      disputes: _disputes,
      notifications: _notifications,
      activity: _activity,
      metrics: _metrics,
      pollar: widget.pollar,
      theme: widget.theme,
      child: ValueListenableBuilder<ThemeMode>(
        valueListenable: widget.theme,
        builder: (context, mode, _) => MaterialApp.router(
          title: 'BolPay',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light,
          darkTheme: AppTheme.dark,
          themeMode: mode,
          routerConfig: _router,
        ),
      ),
    );
  }
}
