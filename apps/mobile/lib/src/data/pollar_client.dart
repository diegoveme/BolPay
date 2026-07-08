import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../core/api_client.dart';
import '../core/pollar_config.dart';
import '../core/token_storage.dart';

/// Custodial wallet session returned by the login endpoint.
class PollarSession {
  const PollarSession({
    required this.accessToken,
    required this.expiresAt,
    required this.publicKey,
    this.mail,
    this.firstName,
    this.lastName,
    this.providers = const {},
  });

  /// Plain Bearer token for the authenticated endpoints.
  final String accessToken;

  /// Access-token expiry in epoch milliseconds.
  final int expiresAt;

  /// Stellar public key of the custodial wallet.
  final String publicKey;

  final String? mail;
  final String? firstName;
  final String? lastName;

  /// Names of the non-null entries under `data.providers`.
  final Set<String> providers;

  /// BolPay auth provider, derived like the web login page.
  String get provider {
    if (providers.contains('google')) return 'google';
    if (providers.contains('github')) return 'github';
    if (providers.contains('wallet')) return 'wallet';
    return 'email';
  }

  /// "First Last" when the profile has any name part, else null.
  String? get fullName {
    final parts = [
      firstName,
      lastName,
    ].whereType<String>().where((part) => part.isNotEmpty).toList();
    return parts.isEmpty ? null : parts.join(' ');
  }

  /// Parses the `content` object of the login response.
  factory PollarSession.fromLoginContent(Map<String, dynamic> content) {
    final token = content['token'] as Map<String, dynamic>? ?? const {};
    final wallet = content['wallet'] as Map<String, dynamic>? ?? const {};
    final data = content['data'] as Map<String, dynamic>? ?? const {};
    final rawProviders = data['providers'];
    return PollarSession(
      accessToken: (token['accessToken'] ?? '').toString(),
      expiresAt: (token['expiresAt'] as num?)?.toInt() ?? 0,
      publicKey: (wallet['publicKey'] ?? '').toString(),
      mail: data['mail'] as String?,
      firstName: data['first_name'] as String?,
      lastName: data['last_name'] as String?,
      providers: {
        if (rawProviders is Map<String, dynamic>)
          for (final entry in rawProviders.entries)
            if (entry.value != null) entry.key,
      },
    );
  }
}

/// Result of the custodial sign-and-send endpoint, which signs with the
/// custodial key AND broadcasts the transaction.
class PollarSubmitOutcome {
  const PollarSubmitOutcome({
    required this.hash,
    required this.status,
    this.resultCode,
    this.message,
  });

  final String hash;

  /// "PENDING" | "SUCCESS" | "FAILED". PENDING still yields a usable hash.
  final String status;

  final String? resultCode;
  final String? message;

  bool get isFailed => status == 'FAILED';

  factory PollarSubmitOutcome.fromJson(Map<String, dynamic> json) {
    return PollarSubmitOutcome(
      hash: (json['hash'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      resultCode: json['resultCode'] as String?,
      message: json['message'] as String?,
    );
  }
}

/// REST client for the custodial wallet service (email OTP login and
/// custodial transaction signing).
///
/// Every request carries the publishable key header; authenticated calls
/// add a plain Bearer token. Success responses use the envelope
/// `{ code, success: true, content }`; failures answer non-2xx with
/// `{ success: false, code }`, mapped here to an [ApiException] with a
/// readable message (same error style as [ApiClient]).
class PollarClient {
  PollarClient({
    required this._storage,
    http.Client? httpClient,
    String? baseUrl,
    String? publishableKey,
  }) : _http = httpClient ?? http.Client(),
       baseUrl = baseUrl ?? PollarConfig.apiUrl,
       publishableKey = publishableKey ?? PollarConfig.publishableKey;

  final TokenStorage _storage;
  final http.Client _http;
  final String baseUrl;
  final String publishableKey;

  /// Whether the custodial login path is available at all.
  bool get isEnabled => publishableKey.isNotEmpty;

  /// POST /auth/session: opens a client session for the OTP flow.
  Future<String> createSession() async {
    final content = await _post('/auth/session');
    return (content['clientSessionId'] ?? '').toString();
  }

  /// POST /auth/email: sends a verification code to [email].
  Future<void> sendEmailCode(String sessionId, String email) async {
    await _post(
      '/auth/email',
      body: {'clientSessionId': sessionId, 'email': email},
    );
  }

  /// POST /auth/email/verify-code: checks the six-digit [code].
  Future<void> verifyEmailCode(String sessionId, String code) async {
    await _post(
      '/auth/email/verify-code',
      body: {'clientSessionId': sessionId, 'code': code},
    );
  }

  /// POST /auth/login: exchanges the verified session for tokens, the
  /// custodial wallet and the profile, and persists the session locally.
  Future<PollarSession> login(String sessionId, {String? deviceLabel}) async {
    final content = await _post(
      '/auth/login',
      body: {
        'clientSessionId': sessionId,
        if (deviceLabel != null && deviceLabel.isNotEmpty)
          'deviceLabel': deviceLabel,
      },
    );
    final session = PollarSession.fromLoginContent(content);
    await _storage.savePollarSession(
      accessToken: session.accessToken,
      expiresAt: session.expiresAt,
      publicKey: session.publicKey,
      email: session.mail,
      name: session.fullName,
    );
    return session;
  }

  /// POST /tx/sign-and-send: signs [unsignedXdr] with the custodial key
  /// and broadcasts it, using the persisted session.
  ///
  /// Throws [ApiException] with status 401 when the persisted session is
  /// missing/expired or the service answers 401 (session expired).
  Future<PollarSubmitOutcome> signAndSendTx(String unsignedXdr) async {
    final stored = await _storage.readPollarSession();
    if (stored == null || stored.isExpired) {
      throw ApiException(401, 'Your wallet session expired.');
    }
    final content = await _post(
      '/tx/sign-and-send',
      bearer: stored.accessToken,
      body: {
        'network': PollarConfig.network,
        'publicKey': stored.publicKey,
        'unsignedXdr': unsignedXdr,
      },
    );
    return PollarSubmitOutcome.fromJson(content);
  }

  /// POST /auth/logout (best effort) and clears the persisted session.
  /// Never throws.
  Future<void> logout() async {
    try {
      final stored = await _storage.readPollarSession();
      if (stored != null) {
        await _post('/auth/logout', bearer: stored.accessToken, body: const {});
      }
    } catch (_) {
      // Best effort: the local session is cleared regardless.
    }
    await _storage.clearPollarSession();
  }

  /// Sends a JSON POST and unwraps the success envelope, returning the
  /// `content` object (empty map when absent). 20s timeout like ApiClient.
  Future<Map<String, dynamic>> _post(
    String path, {
    Object? body,
    String? bearer,
  }) async {
    http.Response response;
    try {
      response = await _http
          .post(
            Uri.parse('$baseUrl$path'),
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'x-pollar-api-key': publishableKey,
              // Publishable keys are origin-restricted; native apps have
              // no browser origin, so present an allowed one explicitly.
              'Origin': PollarConfig.allowedOrigin,
              if (bearer != null && bearer.isNotEmpty)
                'Authorization': 'Bearer $bearer',
            },
            body: body == null ? null : jsonEncode(body),
          )
          .timeout(const Duration(seconds: 20));
    } on SocketException {
      throw ApiException(0, 'Could not reach the wallet service.');
    } on TimeoutException {
      throw ApiException(0, 'The request took too long. Try again.');
    } on http.ClientException {
      throw ApiException(0, 'Could not reach the wallet service.');
    }
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return const {};
      final decoded = jsonDecode(utf8.decode(response.bodyBytes));
      if (decoded is Map<String, dynamic>) {
        final content = decoded['content'];
        if (content is Map<String, dynamic>) return content;
      }
      return const {};
    }
    throw ApiException(response.statusCode, _messageForFailure(response));
  }

  /// Maps the failure envelope `{ success: false, code }` to a readable
  /// message.
  String _messageForFailure(http.Response response) {
    var code = '';
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) {
        code = (decoded['code'] ?? '').toString();
      }
    } catch (_) {
      // Non-JSON body: fall through to the generic messages.
    }
    final upper = code.toUpperCase();
    if (upper.contains('CODE') &&
        (upper.contains('INVALID') ||
            upper.contains('EXPIRED') ||
            upper.contains('WRONG'))) {
      return 'The verification code is invalid or expired. Try again.';
    }
    if (upper.contains('EMAIL') && upper.contains('INVALID')) {
      return 'That email address was rejected. Check it and try again.';
    }
    if (response.statusCode == 401) {
      return 'Your wallet session expired.';
    }
    if (upper.contains('RATE') || response.statusCode == 429) {
      return 'Too many attempts. Wait a moment and try again.';
    }
    if (code.isEmpty) {
      return 'Unexpected wallet service error (${response.statusCode}).';
    }
    return 'Wallet service error: $code';
  }
}
