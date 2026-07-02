import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Custodial wallet session persisted alongside the BolPay session so the
/// app can sign escrow transactions after a restart.
class StoredPollarSession {
  const StoredPollarSession({
    required this.accessToken,
    required this.expiresAt,
    required this.publicKey,
    this.email,
    this.name,
  });

  final String accessToken;

  /// Access-token expiry in epoch milliseconds.
  final int expiresAt;

  /// Stellar public key of the custodial wallet.
  final String publicKey;

  final String? email;
  final String? name;

  bool get isExpired => DateTime.now().millisecondsSinceEpoch >= expiresAt;
}

/// Local persistence of the session token (JWT access token), the pending
/// invitation token captured from an accept-invite deep link, the wallet
/// source and the custodial wallet session.
///
/// Money-moving secrets (the BolPay JWT, the custodial wallet token and its
/// public key, the invitation token) live in platform-backed secure storage
/// (Android EncryptedSharedPreferences/Keystore, iOS Keychain) so they are
/// device-bound and excluded from backups. Only non-sensitive UI state (the
/// wallet source) stays in plaintext SharedPreferences.
///
/// Every secret read is fail-soft: a secure-storage failure returns null
/// (treated as logged-out) instead of throwing, so a storage hiccup can never
/// crash the app on launch. A one-time migration lifts any legacy plaintext
/// value out of SharedPreferences into secure storage on first read.
class TokenStorage {
  TokenStorage({FlutterSecureStorage? secureStorage})
    : _secure =
          secureStorage ??
          const FlutterSecureStorage(
            aOptions: AndroidOptions(encryptedSharedPreferences: true),
            iOptions: IOSOptions(
              accessibility: KeychainAccessibility.first_unlock_this_device,
            ),
          );

  final FlutterSecureStorage _secure;

  static const _tokenKey = 'bolpay.accessToken';
  static const _invitationKey = 'bolpay.invitationToken';
  static const _walletSourceKey = 'bolpay.walletSource';
  static const _pollarTokenKey = 'bolpay.pollar.accessToken';
  static const _pollarExpiresKey = 'bolpay.pollar.expiresAt';
  static const _pollarPublicKeyKey = 'bolpay.pollar.publicKey';
  static const _pollarEmailKey = 'bolpay.pollar.email';
  static const _pollarNameKey = 'bolpay.pollar.name';

  Future<String?> readToken() => _readSecret(_tokenKey);

  Future<void> saveToken(String token) => _writeSecret(_tokenKey, token);

  Future<void> clear() => _deleteSecret(_tokenKey);

  /// Invitation token stashed by the accept-invite screen and consumed by
  /// the login flow.
  Future<String?> readInvitationToken() => _readSecret(_invitationKey);

  Future<void> saveInvitationToken(String token) =>
      _writeSecret(_invitationKey, token);

  Future<void> clearInvitationToken() => _deleteSecret(_invitationKey);

  /// How the session signs escrow actions: 'pollar' (custodial) or
  /// 'manual' (address typed by hand; signatures happen on the web app).
  /// Mirrors the web's `bolpay.walletSource` localStorage key. This is not a
  /// secret, so it stays in SharedPreferences.
  Future<String?> readWalletSource() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_walletSourceKey);
  }

  Future<void> saveWalletSource(String source) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_walletSourceKey, source);
  }

  Future<void> clearWalletSource() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_walletSourceKey);
  }

  /// Persists the custodial wallet session after a successful login.
  Future<void> savePollarSession({
    required String accessToken,
    required int expiresAt,
    required String publicKey,
    String? email,
    String? name,
  }) async {
    await _writeSecret(_pollarTokenKey, accessToken);
    await _writeSecret(_pollarExpiresKey, expiresAt.toString());
    await _writeSecret(_pollarPublicKeyKey, publicKey);
    if (email != null && email.isNotEmpty) {
      await _writeSecret(_pollarEmailKey, email);
    } else {
      await _deleteSecret(_pollarEmailKey);
    }
    if (name != null && name.isNotEmpty) {
      await _writeSecret(_pollarNameKey, name);
    } else {
      await _deleteSecret(_pollarNameKey);
    }
  }

  /// Reads the persisted custodial wallet session, or null when there is
  /// none (or it is incomplete).
  Future<StoredPollarSession?> readPollarSession() async {
    final accessToken = await _readSecret(_pollarTokenKey);
    final expiresAt = int.tryParse(await _readSecret(_pollarExpiresKey) ?? '');
    final publicKey = await _readSecret(_pollarPublicKeyKey);
    if (accessToken == null ||
        accessToken.isEmpty ||
        expiresAt == null ||
        publicKey == null ||
        publicKey.isEmpty) {
      return null;
    }
    return StoredPollarSession(
      accessToken: accessToken,
      expiresAt: expiresAt,
      publicKey: publicKey,
      email: await _readSecret(_pollarEmailKey),
      name: await _readSecret(_pollarNameKey),
    );
  }

  Future<void> clearPollarSession() async {
    await _deleteSecret(_pollarTokenKey);
    await _deleteSecret(_pollarExpiresKey);
    await _deleteSecret(_pollarPublicKeyKey);
    await _deleteSecret(_pollarEmailKey);
    await _deleteSecret(_pollarNameKey);
  }

  // --------------------------------------------------------------------------
  // Secure-storage helpers
  // --------------------------------------------------------------------------

  /// Reads a secret from secure storage. On first read, migrates any legacy
  /// plaintext value stored under the same key in SharedPreferences into
  /// secure storage and removes it from prefs. A secure-storage read failure
  /// returns null (treated as logged-out) rather than throwing.
  Future<String?> _readSecret(String key) async {
    try {
      final existing = await _secure.read(key: key);
      if (existing != null) return existing;
    } catch (_) {
      // Secure storage unavailable/corrupt: treat as no session.
      return null;
    }
    // One-time migration of a legacy plaintext value.
    final prefs = await SharedPreferences.getInstance();
    final legacy = prefs.get(key);
    if (legacy == null) return null;
    final value = legacy.toString();
    try {
      await _secure.write(key: key, value: value);
    } catch (_) {
      // Migration write failed: still remove the plaintext copy below.
    }
    await prefs.remove(key);
    return value;
  }

  Future<void> _writeSecret(String key, String value) =>
      _secure.write(key: key, value: value);

  Future<void> _deleteSecret(String key) async {
    try {
      await _secure.delete(key: key);
    } catch (_) {
      // Best effort: a failed delete must not break logout/teardown.
    }
  }
}
