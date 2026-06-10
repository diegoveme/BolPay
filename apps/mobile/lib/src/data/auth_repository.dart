import '../core/api_client.dart';
import '../domain/models/user.dart';

/// Resultado del login: token de acceso + usuario.
class LoginResult {
  const LoginResult({required this.accessToken, required this.user});

  final String accessToken;
  final User user;
}

/// Acceso a los endpoints de autenticación (/auth).
class AuthRepository {
  AuthRepository(this._api);

  final ApiClient _api;

  Future<LoginResult> login({
    required String email,
    required String stellarAddress,
    String provider = 'email',
    String? role,
    String? name,
    String? invitationToken,
  }) async {
    final body = <String, dynamic>{
      'email': email,
      'provider': provider,
      'stellarAddress': stellarAddress,
      'role': ?role,
      if (name != null && name.isNotEmpty) 'name': name,
      if (invitationToken != null && invitationToken.isNotEmpty)
        'invitationToken': invitationToken,
    };
    final json = await _api.post('/auth/login', body: body)
        as Map<String, dynamic>;
    return LoginResult(
      accessToken: (json['accessToken'] ?? '').toString(),
      user: User.fromJson(json['user'] as Map<String, dynamic>? ?? const {}),
    );
  }

  Future<User> me() async {
    final json = await _api.get('/auth/me') as Map<String, dynamic>;
    return User.fromJson(json);
  }
}
