import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../../../ui/theme.dart';

/// Read-only date input that opens the platform date picker.
class DateField extends StatelessWidget {
  const DateField({
    super.key,
    required this.label,
    required this.value,
    required this.onTap,
    required this.onClear,
  });

  final String label;
  final String value;
  final VoidCallback onTap;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppTheme.radiusControl),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          suffixIcon: value.isEmpty
              ? Icon(
                  Icons.calendar_today_outlined,
                  size: 18,
                  color: colors.textMuted,
                )
              : IconButton(
                  icon: const Icon(Icons.close, size: 18),
                  onPressed: onClear,
                ),
        ),
        child: Text(
          value.isEmpty ? 'Select a date' : formatDate(value),
          style: TextStyle(
            fontSize: 14,
            color: value.isEmpty ? colors.textFaint : colors.text,
          ),
        ),
      ),
    );
  }
}
