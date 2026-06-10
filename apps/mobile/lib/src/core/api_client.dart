import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'api_config.dart';

/// Error proveniente del backend de BolPay.
///
/// Extrae el campo `message` del cuerpo de la respuesta, que puede ser un
/// `String` o una lista de strings (errores de validación de NestJS).
class ApiException implements Exception {
  ApiException(this.statusCode, this.message);

  final int statusCode;
  final String message;

  factory ApiException.fromResponse(http.Response response) {
    var message = 'Error inesperado (${response.statusCode})';
    try {
      final body = jsonDecode(response.body);
      if (body is Map<String, dynamic>) {
        final raw = body['message'];
        if (raw is String && raw.isNotEmpty) {
          message = raw;
        } else if (raw is List && raw.isNotEmpty) {
          message = raw.map((e) => e.toString()).join('\n');
        }
      }
    } catch (_) {
      // Cuerpo no JSON: se mantiene el mensaje genérico.
    }
    return ApiException(response.statusCode, message);
  }

  @override
  String toString() => message;
}

/// Cliente HTTP de la API de BolPay.
///
/// Adjunta automáticamente el header `Authorization: Bearer <token>` cuando
/// el [tokenProvider] devuelve un token (interceptor de autenticación).
class ApiClient {
  ApiClient({String? baseUrl, http.Client? httpClient, this._tokenProvider})
    : baseUrl = baseUrl ?? ApiConfig.baseUrl,
      _http = httpClient ?? http.Client();

  final String baseUrl;
  final http.Client _http;
  final Future<String?> Function()? _tokenProvider;

  Future<Map<String, String>> _headers() async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    final token = await _tokenProvider?.call();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Future<dynamic> get(String path) async {
    return _send(() async {
      return _http.get(Uri.parse('$baseUrl$path'), headers: await _headers());
    });
  }

  Future<dynamic> post(String path, {Object? body}) async {
    return _send(() async {
      return _http.post(
        Uri.parse('$baseUrl$path'),
        headers: await _headers(),
        body: body == null ? null : jsonEncode(body),
      );
    });
  }

  Future<dynamic> _send(Future<http.Response> Function() request) async {
    http.Response response;
    try {
      response = await request().timeout(const Duration(seconds: 20));
    } on SocketException {
      throw ApiException(0, 'No se pudo conectar con el servidor.');
    } on TimeoutException {
      throw ApiException(0, 'La solicitud tardó demasiado. Intenta de nuevo.');
    } on http.ClientException {
      throw ApiException(0, 'No se pudo conectar con el servidor.');
    }
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return null;
      return jsonDecode(utf8.decode(response.bodyBytes));
    }
    throw ApiException.fromResponse(response);
  }
}
