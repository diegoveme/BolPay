import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:bolpay_mobile/src/core/api_client.dart';
import 'package:bolpay_mobile/src/core/token_storage.dart';
import 'package:bolpay_mobile/src/data/pollar_client.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    // In-memory secure storage so the token store works under test.
    FlutterSecureStorage.setMockInitialValues({});
  });

  PollarClient buildClient(MockClient http) => PollarClient(
    storage: TokenStorage(),
    httpClient: http,
    baseUrl: 'https://wallet.test',
    publishableKey: 'pub_test_key',
  );

  test(
    'createSession unwraps the success envelope and sends the api key',
    () async {
      late http.Request seen;
      final client = buildClient(
        MockClient((request) async {
          seen = request;
          return http.Response(
            jsonEncode({
              'code': 'SDK_SESSION_CREATED',
              'success': true,
              'content': {'clientSessionId': 'cs_123'},
            }),
            201,
          );
        }),
      );

      final sessionId = await client.createSession();

      expect(sessionId, 'cs_123');
      expect(seen.url.path, '/auth/session');
      expect(seen.headers['x-pollar-api-key'], 'pub_test_key');
    },
  );

  test(
    'an invalid verification code maps to a readable ApiException',
    () async {
      final client = buildClient(
        MockClient(
          (request) async => http.Response(
            jsonEncode({'success': false, 'code': 'SDK_EMAIL_CODE_INVALID'}),
            400,
          ),
        ),
      );

      await expectLater(
        client.verifyEmailCode('cs_123', '000000'),
        throwsA(
          isA<ApiException>().having(
            (e) => e.message,
            'message',
            contains('verification code is invalid or expired'),
          ),
        ),
      );
    },
  );

  test('login parses the session and persists it for signing', () async {
    final client = buildClient(
      MockClient(
        (request) async => http.Response(
          jsonEncode({
            'code': 'SDK_LOGIN_SUCCESS',
            'success': true,
            'content': {
              'clientSessionId': 'cs_123',
              'userId': 'u_9',
              'status': 'ready',
              'token': {
                'accessToken': 'at_abc',
                'refreshToken': 'rt_abc',
                'expiresAt':
                    DateTime.now().millisecondsSinceEpoch + 3600 * 1000,
              },
              'user': {'id': 'u_9', 'ready': true},
              'wallet': {'publicKey': 'G${'B' * 55}'},
              'data': {
                'mail': 'ana@bolpay.com',
                'first_name': 'Ana',
                'last_name': 'Quispe',
                'avatar': '',
                'providers': {
                  'email': {'address': 'ana@bolpay.com'},
                  'google': null,
                  'github': null,
                  'wallet': null,
                },
              },
            },
          }),
          200,
        ),
      ),
    );

    final session = await client.login('cs_123');

    expect(session.publicKey, 'G${'B' * 55}');
    expect(session.provider, 'email');
    expect(session.fullName, 'Ana Quispe');

    final stored = await TokenStorage().readPollarSession();
    expect(stored, isNotNull);
    expect(stored!.publicKey, session.publicKey);
    expect(stored.isExpired, isFalse);
  });

  test('signAndSendTx sends the bearer token and maps the outcome', () async {
    await TokenStorage().savePollarSession(
      accessToken: 'at_abc',
      expiresAt: DateTime.now().millisecondsSinceEpoch + 3600 * 1000,
      publicKey: 'G${'C' * 55}',
    );
    late http.Request seen;
    final client = buildClient(
      MockClient((request) async {
        seen = request;
        return http.Response(
          jsonEncode({
            'code': 'SDK_TX_SUBMIT',
            'success': true,
            'content': {'hash': 'deadbeef', 'status': 'SUCCESS'},
          }),
          200,
        );
      }),
    );

    final outcome = await client.signAndSendTx('AAAA-unsigned-xdr');

    expect(seen.url.path, '/tx/sign-and-send');
    expect(seen.headers['Authorization'], 'Bearer at_abc');
    final body = jsonDecode(seen.body) as Map<String, dynamic>;
    expect(body['publicKey'], 'G${'C' * 55}');
    expect(body['unsignedXdr'], 'AAAA-unsigned-xdr');
    expect(outcome.hash, 'deadbeef');
    expect(outcome.isFailed, isFalse);
  });

  test(
    'signAndSendTx rejects with 401 when the session is missing or expired',
    () async {
      final client = buildClient(
        MockClient((request) async => http.Response('{}', 200)),
      );

      await expectLater(
        client.signAndSendTx('AAAA'),
        throwsA(
          isA<ApiException>().having((e) => e.statusCode, 'statusCode', 401),
        ),
      );
    },
  );
}
