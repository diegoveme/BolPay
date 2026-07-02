/// BolPay API configuration.
///
/// The base URL can be overridden at build time with
/// `--dart-define=API_URL=https://my-backend/api`. The default points to
/// the host loopback as seen from the Android emulator (10.0.2.2).
class ApiConfig {
  ApiConfig._();

  static const String baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://10.0.2.2:3000/api',
  );

  /// Stellar network used to build explorer links ("testnet" or "public").
  static const String stellarNetwork = String.fromEnvironment(
    'STELLAR_NETWORK',
    defaultValue: 'testnet',
  );
}
