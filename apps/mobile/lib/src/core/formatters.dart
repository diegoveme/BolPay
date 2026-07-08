/// Formatting utilities (USDC amounts, dates, addresses) with no external
/// dependencies. English (en-US) locale, matching the web app.
library;

const List<String> _months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/// Placeholder used by the web app for missing values.
const String emptyPlaceholder = '·';

/// Formats a decimal string amount (e.g. "1500.500000") as "1,500.50 USDC".
///
/// Null or empty values render as the `·` placeholder, like the web.
String formatUsdc(String? amount) {
  if (amount == null || amount.isEmpty) return emptyPlaceholder;
  final value = double.tryParse(amount);
  if (value == null) return '$amount USDC';
  final fixed = value.toStringAsFixed(2);
  final parts = fixed.split('.');
  final digits = parts[0];
  final buffer = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    final remaining = digits.length - i;
    buffer.write(digits[i]);
    if (remaining > 1 && remaining % 3 == 1 && digits[i] != '-') {
      buffer.write(',');
    }
  }
  return '$buffer.${parts[1]} USDC';
}

/// Formats an ISO-8601 date as "Jun 9, 2026" (local time).
String formatDate(String? iso) {
  if (iso == null || iso.isEmpty) return emptyPlaceholder;
  final date = DateTime.tryParse(iso)?.toLocal();
  if (date == null) return iso;
  return '${_months[date.month - 1]} ${date.day}, ${date.year}';
}

/// Formats an ISO-8601 date as "Jun 9, 2026, 12:00 PM" (local time).
String formatDateTime(String? iso) {
  if (iso == null || iso.isEmpty) return emptyPlaceholder;
  final date = DateTime.tryParse(iso)?.toLocal();
  if (date == null) return iso;
  final hour12 = date.hour % 12 == 0 ? 12 : date.hour % 12;
  final minute = date.minute.toString().padLeft(2, '0');
  final period = date.hour < 12 ? 'AM' : 'PM';
  return '${_months[date.month - 1]} ${date.day}, ${date.year}, '
      '$hour12:$minute $period';
}

/// Compact number for chart axes and tight tiles: "1.2K", "3.4M", "1.2B"
/// (no currency). Mirrors the web `formatCompact` (Intl compact, en-US).
String formatCompact(num value) {
  final v = value.toDouble();
  final abs = v.abs();
  String withSuffix(double scaled, String suffix) {
    final fixed = scaled.toStringAsFixed(1);
    final trimmed = fixed.endsWith('.0')
        ? fixed.substring(0, fixed.length - 2)
        : fixed;
    return '$trimmed$suffix';
  }

  if (abs >= 1e9) return withSuffix(v / 1e9, 'B');
  if (abs >= 1e6) return withSuffix(v / 1e6, 'M');
  if (abs >= 1e3) return withSuffix(v / 1e3, 'K');
  if (v == v.roundToDouble()) return v.toInt().toString();
  return v.toStringAsFixed(1);
}

/// Compact relative time: "just now", "5m ago", "3h ago", "2d ago",
/// then falls back to [formatDate].
String relativeTime(String? iso) {
  if (iso == null || iso.isEmpty) return emptyPlaceholder;
  final date = DateTime.tryParse(iso)?.toLocal();
  if (date == null) return iso;
  final diff = DateTime.now().difference(date);
  if (diff.inSeconds < 60) return 'just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  return formatDate(iso);
}

/// Shortens a Stellar address or tx hash: first 6 + ellipsis + last 6.
String shortAddress(String address) {
  if (address.length <= 12) return address;
  return '${address.substring(0, 6)}…'
      '${address.substring(address.length - 6)}';
}

/// Stellar public key (G-address) format.
final RegExp stellarAddressRegExp = RegExp(r'^G[A-Z2-7]{55}$');

/// Loose email format used by forms and the invite-by-email affordance.
final RegExp emailRegExp = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
