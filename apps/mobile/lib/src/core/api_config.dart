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

  /// stellar.expert link for a transaction hash. Simulated-mode hashes start
  /// with `SIM` and have no on-chain counterpart, so they get no link.
  static String? explorerTxUrl(String? txHash) {
    if (txHash == null || txHash.isEmpty || txHash.startsWith('SIM')) {
      return null;
    }
    const network =
        stellarNetwork == 'public' || stellarNetwork == 'mainnet'
        ? 'public'
        : 'testnet';
    return 'https://stellar.expert/explorer/$network/tx/$txHash';
  }
}
