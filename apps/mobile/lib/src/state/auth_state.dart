import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../core/token_storage.dart';
import '../data/auth_repository.dart';
import '../domain/models/user.dart';

/// Estado global de la sesión (ChangeNotifier).
///
/// Usado por el router (`refreshListenable`) para redirigir según haya o no
/// sesión activa, y por las pantallas de login y perfil.
class AuthState extends ChangeNotifier {
  AuthState({required this._repository, required this._storage});

  final AuthRepository _repository;
  final TokenStorage _storage;

  String? _token;
  User? _user;

  bool get isAuthenticated => _token != null && _token!.isNotEmpty;
  User? get user => _user;

  /// Restaura la sesión guardada en disco al arrancar la app.
  Future<void> restore() async {
    _token = await _storage.readToken();
    if (isAuthenticated) {
      // Refresca el usuario en segundo plano; si el token expiró, cierra
      // la sesión.
      _refreshUser();
    }
  }

  Future<void> _refreshUser() async {
    try {
      _user = await _repository.me();
      notifyListeners();
    } on ApiException catch (e) {
      if (e.statusCode == 401) await logout();
    } catch (_) {
      // Sin red: se mantiene la sesión local.
    }
  }

  Future<void> login({
    required String email,
    required String stellarAddress,
    String? role,
    String? name,
  }) async {
    final result = await _repository.login(
      email: email,
      stellarAddress: stellarAddress,
      role: role,
      name: name,
    );
    _token = result.accessToken;
    _user = result.user;
    await _storage.saveToken(result.accessToken);
    notifyListeners();
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    await _storage.clear();
    notifyListeners();
  }
}
