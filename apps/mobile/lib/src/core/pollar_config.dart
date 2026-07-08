import 'api_config.dart';

/// Custodial wallet service configuration.
///
/// The publishable key is provided at build time with
/// `--dart-define=POLLAR_PUBLISHABLE_KEY=pk_...`; when it is empty the
/// login screen only offers the manual wallet-address form (dev parity).
class PollarConfig {
  PollarConfig._();

  static const String _rawPublishableKey = String.fromEnvironment(
    'POLLAR_PUBLISHABLE_KEY',
    defaultValue: '',
  );

  /// Publishable API key sent as `x-pollar-api-key` on every request.
  /// Surrounding quotes/whitespace are stripped so a value pasted straight
  /// from an .env file still works.
  static String get publishableKey =>
      _rawPublishableKey.trim().replaceAll(RegExp('^["\']+|["\']+\$'), '');

  /// Base URL of the wallet service CLIENT (SDK) REST API, including the
  /// version prefix. Note this is the publishable-key host used by the
  /// browser/mobile SDKs, not the server API (api.pollar.xyz) that the
  /// backend calls with the secret key.
  static const String apiUrl = String.fromEnvironment(
    'POLLAR_API_URL',
    defaultValue: 'https://sdk.api.pollar.xyz/v1',
  );

  /// Origin presented to the wallet service. Publishable keys are
  /// origin-restricted (403 ORIGIN_NOT_ALLOWED otherwise) and a native app
  /// has no browser origin, so the app presents one of the origins allowed
  /// for its own key (the web app's dev origin by default).
  static const String allowedOrigin = String.fromEnvironment(
    'POLLAR_ALLOWED_ORIGIN',
    defaultValue: 'http://localhost:5173',
  );

  /// Network name expected by the sign-and-send endpoint
  /// ("testnet" | "mainnet"), derived from [ApiConfig.stellarNetwork].
  static String get network =>
      ApiConfig.stellarNetwork == 'public' ||
          ApiConfig.stellarNetwork == 'mainnet'
      ? 'mainnet'
      : 'testnet';
}
