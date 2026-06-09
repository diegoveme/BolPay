import 'dart:convert';

import 'package:http/http.dart' as http;

/// Minimal HTTP client for the BolPay API.
///
/// The base URL is injected at build time via --dart-define=API_URL=...
/// Default targets the Android emulator's host loopback (10.0.2.2). On iOS
/// simulators use http://localhost:3000/api instead.
class ApiClient {
  ApiClient({String? baseUrl})
    : baseUrl =
          baseUrl ??
          const String.fromEnvironment(
            'API_URL',
            defaultValue: 'http://10.0.2.2:3000/api',
          );

  final String baseUrl;

  Future<Map<String, dynamic>> getJson(String path) async {
    final res = await http.get(Uri.parse('$baseUrl$path'));
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('GET $path failed: ${res.statusCode}');
  }
}
