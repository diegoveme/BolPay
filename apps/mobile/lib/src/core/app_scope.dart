import 'package:flutter/widgets.dart';

import '../data/activity_repository.dart';
import '../data/contracts_repository.dart';
import '../data/disputes_repository.dart';
import '../data/escrow_repository.dart';
import '../data/metrics_repository.dart';
import '../data/milestones_repository.dart';
import '../data/notifications_repository.dart';
import '../data/payroll_repository.dart';
import '../data/pollar_client.dart';
import '../data/users_repository.dart';
import '../state/auth_state.dart';
import 'theme_controller.dart';
import 'token_storage.dart';

/// Simple dependency injection via InheritedWidget.
///
/// Exposes the session state and every repository to the whole tree
/// without adding state-management packages.
class AppScope extends InheritedWidget {
  const AppScope({
    super.key,
    required this.auth,
    required this.storage,
    required this.users,
    required this.contracts,
    required this.milestones,
    required this.escrows,
    required this.payrolls,
    required this.disputes,
    required this.notifications,
    required this.activity,
    required this.metrics,
    required this.pollar,
    required this.theme,
    required super.child,
  });

  final AuthState auth;
  final TokenStorage storage;

  /// Custodial wallet client (email OTP login + transaction signing).
  final PollarClient pollar;

  /// App-wide theme mode (system / light / dark), persisted locally.
  final ThemeController theme;
  final UsersRepository users;
  final ContractsRepository contracts;
  final MilestonesRepository milestones;
  final EscrowRepository escrows;
  final PayrollRepository payrolls;
  final DisputesRepository disputes;
  final NotificationsRepository notifications;
  final ActivityRepository activity;
  final MetricsRepository metrics;

  static AppScope of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope not found in the widget tree');
    return scope!;
  }

  /// Read without registering a dependency (for callbacks and handlers).
  static AppScope read(BuildContext context) {
    final scope = context.getInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope not found in the widget tree');
    return scope!;
  }

  @override
  bool updateShouldNotify(AppScope oldWidget) =>
      auth != oldWidget.auth ||
      storage != oldWidget.storage ||
      users != oldWidget.users ||
      contracts != oldWidget.contracts ||
      milestones != oldWidget.milestones ||
      escrows != oldWidget.escrows ||
      payrolls != oldWidget.payrolls ||
      disputes != oldWidget.disputes ||
      notifications != oldWidget.notifications ||
      activity != oldWidget.activity ||
      metrics != oldWidget.metrics ||
      pollar != oldWidget.pollar ||
      theme != oldWidget.theme;
}
