import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'src/core/api_client.dart';
import 'src/core/app_scope.dart';
import 'src/core/token_storage.dart';
import 'src/data/auth_repository.dart';
import 'src/data/contracts_repository.dart';
import 'src/data/notifications_repository.dart';
import 'src/router/app_router.dart';
import 'src/state/auth_state.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final storage = TokenStorage();
  final apiClient = ApiClient(tokenProvider: storage.readToken);
  final auth = AuthState(
    repository: AuthRepository(apiClient),
    storage: storage,
  );
  await auth.restore();

  runApp(
    BolPayApp(
      auth: auth,
      contracts: ContractsRepository(apiClient),
      notifications: NotificationsRepository(apiClient),
    ),
  );
}

class BolPayApp extends StatefulWidget {
  const BolPayApp({
    super.key,
    required this.auth,
    required this.contracts,
    required this.notifications,
  });

  final AuthState auth;
  final ContractsRepository contracts;
  final NotificationsRepository notifications;

  @override
  State<BolPayApp> createState() => _BolPayAppState();
}

class _BolPayAppState extends State<BolPayApp> {
  late final GoRouter _router = createAppRouter(widget.auth);

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const seedColor = Color(0xFF1B5FFF);
    return AppScope(
      auth: widget.auth,
      contracts: widget.contracts,
      notifications: widget.notifications,
      child: MaterialApp.router(
        title: 'BolPay',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(colorSchemeSeed: seedColor, useMaterial3: true),
        darkTheme: ThemeData(
          colorSchemeSeed: seedColor,
          brightness: Brightness.dark,
          useMaterial3: true,
        ),
        themeMode: ThemeMode.system,
        routerConfig: _router,
      ),
    );
  }
}
