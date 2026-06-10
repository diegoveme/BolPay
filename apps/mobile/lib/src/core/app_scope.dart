import 'package:flutter/widgets.dart';

import '../data/contracts_repository.dart';
import '../data/notifications_repository.dart';
import '../state/auth_state.dart';

/// Inyección de dependencias simple vía InheritedWidget.
///
/// Expone el estado de sesión y los repositorios a todo el árbol sin
/// agregar paquetes de gestión de estado.
class AppScope extends InheritedWidget {
  const AppScope({
    super.key,
    required this.auth,
    required this.contracts,
    required this.notifications,
    required super.child,
  });

  final AuthState auth;
  final ContractsRepository contracts;
  final NotificationsRepository notifications;

  static AppScope of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope no encontrado en el árbol de widgets');
    return scope!;
  }

  /// Lectura sin registrar dependencia (para callbacks y handlers).
  static AppScope read(BuildContext context) {
    final scope = context.getInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope no encontrado en el árbol de widgets');
    return scope!;
  }

  @override
  bool updateShouldNotify(AppScope oldWidget) =>
      auth != oldWidget.auth ||
      contracts != oldWidget.contracts ||
      notifications != oldWidget.notifications;
}
