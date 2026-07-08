import 'package:flutter/services.dart';

/// Uppercases the Stellar address as the user types (G-addresses are
/// base32 uppercase).
class UpperCaseTextFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    return newValue.copyWith(text: newValue.text.toUpperCase());
  }
}
