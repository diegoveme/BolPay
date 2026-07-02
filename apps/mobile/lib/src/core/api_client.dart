import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import 'api_config.dart';

/// Error returned by the BolPay backend.
///
/// Extracts the `message` field from the response body, which can be a
/// `String` or a list of strings (NestJS validation errors).
class ApiException implements Exception {
  ApiException(this.statusCode, this.message);

  final int statusCode;
  final String message;

  factory ApiException.fromResponse(http.Response response) {
    var message = 'Unexpected error (${response.statusCode})';
    try {
      final body = jsonDecode(response.body);
      if (body is Map<String, dynamic>) {
        final raw = body['message'];
        if (raw is String && raw.isNotEmpty) {
          message = raw;
        } else if (raw is List && raw.isNotEmpty) {
          message = raw.map((e) => e.toString()).join(' · ');
        }
      }
    } catch (_) {
      // Non-JSON body: keep the generic message.
    }
    return ApiException(response.statusCode, message);
  }

  @override
  String toString() => message;
}

/// HTTP client for the BolPay API.
///
/// Automatically attaches the `Authorization: Bearer <token>` header when
/// the [tokenProvider] returns a token (auth interceptor).
class ApiClient {
  ApiClient({String? baseUrl, http.Client? httpClient, this._tokenProvider})
    : baseUrl = baseUrl ?? ApiConfig.baseUrl,
      _http = httpClient ?? http.Client();

  final String baseUrl;
  final http.Client _http;
  final Future<String?> Function()? _tokenProvider;

  Future<Map<String, String>> _headers({bool json = true}) async {
    final headers = <String, String>{'Accept': 'application/json'};
    if (json) headers['Content-Type'] = 'application/json';
    final token = await _tokenProvider?.call();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Uri _uri(String path, [Map<String, String>? query]) {
    final uri = Uri.parse('$baseUrl$path');
    if (query == null || query.isEmpty) return uri;
    return uri.replace(queryParameters: {...uri.queryParameters, ...query});
  }

  /// GET request with optional query parameters.
  Future<dynamic> get(String path, {Map<String, String>? query}) async {
    return _send(() async {
      return _http.get(_uri(path, query), headers: await _headers());
    });
  }

  /// POST request with an optional JSON-encoded [body].
  Future<dynamic> post(String path, {Object? body}) async {
    return _send(() async {
      return _http.post(
        _uri(path),
        headers: await _headers(),
        body: body == null ? null : jsonEncode(body),
      );
    });
  }

  /// PATCH request with an optional JSON-encoded [body].
  Future<dynamic> patch(String path, {Object? body}) async {
    return _send(() async {
      return _http.patch(
        _uri(path),
        headers: await _headers(),
        body: body == null ? null : jsonEncode(body),
      );
    });
  }

  /// DELETE request for the given [path].
  Future<dynamic> delete(String path) async {
    return _send(() async {
      return _http.delete(_uri(path), headers: await _headers());
    });
  }

  /// Multipart POST used for file uploads (e.g. profile avatars).
  ///
  /// The body is encoded manually so the file part carries an explicit
  /// `Content-Type` (the backend validates the mime type) without extra
  /// dependencies.
  Future<dynamic> postMultipart(
    String path, {
    Map<String, String> fields = const {},
    required String fileField,
    required String filename,
    required List<int> bytes,
    String contentType = 'application/octet-stream',
  }) async {
    final boundary = 'bolpay-boundary-${DateTime.now().microsecondsSinceEpoch}';
    final body = BytesBuilder();
    void writeLine([String line = '']) => body.add(utf8.encode('$line\r\n'));

    fields.forEach((name, value) {
      writeLine('--$boundary');
      writeLine('Content-Disposition: form-data; name="$name"');
      writeLine();
      writeLine(value);
    });
    writeLine('--$boundary');
    writeLine(
      'Content-Disposition: form-data; name="$fileField"; '
      'filename="$filename"',
    );
    writeLine('Content-Type: $contentType');
    writeLine();
    body.add(bytes);
    writeLine();
    writeLine('--$boundary--');

    return _send(() async {
      final headers = await _headers(json: false);
      headers['Content-Type'] = 'multipart/form-data; boundary=$boundary';
      return _http.post(_uri(path), headers: headers, body: body.takeBytes());
    });
  }

  Future<dynamic> _send(Future<http.Response> Function() request) async {
    http.Response response;
    try {
      response = await request().timeout(const Duration(seconds: 20));
    } on SocketException {
      throw ApiException(0, 'Could not reach the server.');
    } on TimeoutException {
      throw ApiException(0, 'The request took too long. Try again.');
    } on http.ClientException {
      throw ApiException(0, 'Could not reach the server.');
    }
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return null;
      return jsonDecode(utf8.decode(response.bodyBytes));
    }
    throw ApiException.fromResponse(response);
  }
}
