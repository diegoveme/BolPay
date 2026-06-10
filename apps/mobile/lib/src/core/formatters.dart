/// Utilidades de formato (montos USDC y fechas) sin dependencias externas.
library;

/// Formatea un monto decimal en string (p. ej. "1500.500000") como USDC.
String formatUsdc(String? amount) {
  if (amount == null || amount.isEmpty) return '—';
  final value = double.tryParse(amount);
  if (value == null) return '$amount USDC';
  var text = value.toStringAsFixed(2);
  // Separador de miles simple.
  final parts = text.split('.');
  final digits = parts[0];
  final buffer = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    final remaining = digits.length - i;
    buffer.write(digits[i]);
    if (remaining > 1 && remaining % 3 == 1 && digits[i] != '-') {
      buffer.write(',');
    }
  }
  text = '$buffer.${parts[1]}';
  return '$text USDC';
}

/// Formatea una fecha ISO-8601 como "dd/mm/aaaa hh:mm" (hora local).
String formatDateTime(String? iso) {
  if (iso == null || iso.isEmpty) return '';
  final date = DateTime.tryParse(iso)?.toLocal();
  if (date == null) return iso;
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(date.day)}/${two(date.month)}/${date.year} '
      '${two(date.hour)}:${two(date.minute)}';
}

/// Acorta una dirección Stellar: GABC…WXYZ.
String shortAddress(String address) {
  if (address.length <= 12) return address;
  return '${address.substring(0, 6)}…${address.substring(address.length - 6)}';
}

final RegExp stellarAddressRegExp = RegExp(r'^G[A-Z2-7]{55}$');
