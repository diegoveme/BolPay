import 'package:shared_preferences/shared_preferences.dart';

/// Persistencia local del token de sesión (accessToken JWT).
class TokenStorage {
  static const _tokenKey = 'bolpay.accessToken';

  Future<String?> readToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }
}
