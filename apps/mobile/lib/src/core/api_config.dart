/// Configuración de la API de BolPay.
///
/// La URL base se puede sobreescribir en tiempo de compilación con
/// `--dart-define=API_URL=https://mi-backend/api`. El valor por defecto
/// apunta al loopback del host desde el emulador de Android (10.0.2.2).
class ApiConfig {
  ApiConfig._();

  static const String baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://10.0.2.2:3000/api',
  );
}
