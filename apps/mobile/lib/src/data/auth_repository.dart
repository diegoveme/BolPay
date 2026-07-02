import '../core/api_client.dart';
import '../domain/models/user.dart';

/// Login result: access token plus the authenticated user.
class LoginResult {
  const LoginResult({required this.accessToken, required this.user});

  final String accessToken;
  final User user;
}

/// Access to the authentication endpoints (/auth).
class AuthRepository {
  AuthRepository(this._api);

  final ApiClient _api;

  /// POST /auth/login with the full LoginDto.
  ///
  /// [email], [role] and [name] are only required on first registration;
  /// [walletAuthXdr] selects the self-custodial verification path and
  /// [invitationToken] claims invited shell accounts.
  Future<LoginResult> login({
    String? email,
    String provider = 'email',
    required String stellarAddress,
    String? pollarWalletId,
    String? walletAuthXdr,
    String? role,
    String? name,
    String? invitationToken,
  }) async {
    final body = <String, dynamic>{
      if (email != null && email.isNotEmpty) 'email': email,
      'provider': provider,
      'stellarAddress': stellarAddress,
      if (pollarWalletId != null && pollarWalletId.isNotEmpty)
        'pollarWalletId': pollarWalletId,
      if (walletAuthXdr != null && walletAuthXdr.isNotEmpty)
        'walletAuthXdr': walletAuthXdr,
      if (role != null && role.isNotEmpty) 'role': role,
      if (name != null && name.isNotEmpty) 'name': name,
      if (invitationToken != null && invitationToken.isNotEmpty)
        'invitationToken': invitationToken,
    };
    final json =
        await _api.post('/auth/login', body: body) as Map<String, dynamic>;
    return LoginResult(
      accessToken: (json['accessToken'] ?? '').toString(),
      user: User.fromJson(json['user'] as Map<String, dynamic>? ?? const {}),
    );
  }

  /// GET /auth/me: current user with profiles and wallets.
  Future<User> me() async {
    final json = await _api.get('/auth/me') as Map<String, dynamic>;
    return User.fromJson(json);
  }

  /// POST /auth/email/request-code: emails a six-digit sign-in code to
  /// [email] (manual self-declared-wallet path).
  Future<void> requestEmailCode(String email) async {
    await _api.post('/auth/email/request-code', body: {'email': email});
  }

  /// POST /auth/email/verify-code: validates the six-digit [code] emailed to
  /// [email]. Throws [ApiException] when the code is wrong or expired.
  Future<void> verifyEmailCode(String email, String code) async {
    await _api.post(
      '/auth/email/verify-code',
      body: {'email': email, 'code': code},
    );
  }

  /// POST /auth/verify-email with the token from the email deep link.
  Future<void> verifyEmail(String token) async {
    await _api.post('/auth/verify-email', body: {'token': token});
  }

  /// POST /auth/resend-verification. Returns true when a new email was
  /// sent, false when the address was already verified.
  Future<bool> resendVerification() async {
    final json = await _api.post('/auth/resend-verification');
    if (json is Map<String, dynamic>) return json['sent'] == true;
    return true;
  }
}
