import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../core/token_storage.dart';
import '../data/auth_repository.dart';
import '../data/pollar_client.dart';
import '../domain/models/user.dart';

/// Global session state (ChangeNotifier).
///
/// Used by the router (`refreshListenable`) to redirect based on whether
/// there is an active session, and by the login and profile screens.
class AuthState extends ChangeNotifier {
  AuthState({
    required this._repository,
    required this._storage,
    required this._pollar,
  });

  final AuthRepository _repository;
  final TokenStorage _storage;
  final PollarClient _pollar;

  String? _token;
  User? _user;

  bool get isAuthenticated => _token != null && _token!.isNotEmpty;
  User? get user => _user;
  String? get token => _token;

  /// Restores the session persisted on disk at app startup.
  Future<void> restore() async {
    _token = await _storage.readToken();
    if (isAuthenticated) {
      // Refresh the user in the background; if the token expired, the
      // session is closed.
      refreshUser();
    }
  }

  /// Re-fetches the current user (GET /auth/me), e.g. after a profile
  /// update or email verification. Logs out on 401.
  Future<void> refreshUser() async {
    try {
      _user = await _repository.me();
      notifyListeners();
    } on ApiException catch (e) {
      if (e.statusCode == 401) await logout();
    } catch (_) {
      // Offline: keep the local session.
    }
  }

  /// Logs in with the full LoginDto and stores the token and user.
  Future<void> login({
    String? email,
    String provider = 'email',
    required String stellarAddress,
    String? pollarWalletId,
    String? walletAuthXdr,
    String? role,
    String? name,
    String? invitationToken,
  }) async {
    final result = await _repository.login(
      email: email,
      provider: provider,
      stellarAddress: stellarAddress,
      pollarWalletId: pollarWalletId,
      walletAuthXdr: walletAuthXdr,
      role: role,
      name: name,
      invitationToken: invitationToken,
    );
    _token = result.accessToken;
    _user = result.user;
    await _storage.saveToken(result.accessToken);
    await _storage.clearInvitationToken();
    notifyListeners();
  }

  /// Emails a six-digit sign-in code for the manual wallet path
  /// (POST /auth/email/request-code).
  Future<void> requestEmailCode(String email) =>
      _repository.requestEmailCode(email);

  /// Validates the six-digit sign-in code (POST /auth/email/verify-code).
  /// Throws when the code is wrong or expired.
  Future<void> verifyEmailCode(String email, String code) =>
      _repository.verifyEmailCode(email, code);

  /// Confirms an email-verification token (POST /auth/verify-email).
  /// Public endpoint; used by the verify-email deep link screen.
  Future<void> verifyEmail(String token) => _repository.verifyEmail(token);

  /// Requests a new verification email (POST /auth/resend-verification).
  /// Returns true when a new email was sent, false when the address was
  /// already verified. Requires an active session.
  Future<bool> resendVerification() => _repository.resendVerification();

  /// Single full-teardown path for a session, used by the profile logout
  /// button and by the automatic 401 handler. Clears the BolPay JWT, the
  /// custodial wallet session, the wallet source and any stashed invitation,
  /// and makes a best-effort attempt to revoke the custodial session on the
  /// server. Never throws.
  Future<void> logout() async {
    _token = null;
    _user = null;
    // Best-effort server-side revoke; also clears the local custodial
    // session on disk regardless of the network result.
    try {
      await _pollar.logout();
    } catch (_) {
      // Ignore: local teardown below still runs.
    }
    await _storage.clear();
    await _storage.clearWalletSource();
    await _storage.clearInvitationToken();
    notifyListeners();
  }
}
