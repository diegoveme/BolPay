import 'package:flutter/material.dart';

import '../theme.dart';

/// Shows a confirmation bottom sheet (web `ConfirmModal` parity).
///
/// The confirm button can carry the amount in its label (for example
/// "Release 500 USDC"), and [danger] renders it in the danger color for
/// irreversible actions. [dangerNote] renders a tinted note such as
/// "This action cannot be undone.".
///
/// Returns true when the user confirms, false or null otherwise.
Future<bool?> showConfirmSheet(
  BuildContext context, {
  required String title,
  required String body,
  String confirmLabel = 'Confirm',
  String cancelLabel = 'Cancel',
  bool danger = false,
  String? dangerNote,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (sheetContext) => _ConfirmSheet(
      title: title,
      body: body,
      confirmLabel: confirmLabel,
      cancelLabel: cancelLabel,
      danger: danger,
      dangerNote: dangerNote,
    ),
  );
}

class _ConfirmSheet extends StatelessWidget {
  const _ConfirmSheet({
    required this.title,
    required this.body,
    required this.confirmLabel,
    required this.cancelLabel,
    required this.danger,
    this.dangerNote,
  });

  final String title;
  final String body;
  final String confirmLabel;
  final String cancelLabel;
  final bool danger;
  final String? dangerNote;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: colors.text,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            body,
            style: TextStyle(fontSize: 14, height: 1.5, color: colors.text),
          ),
          if (dangerNote != null) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: colors.dangerBg,
                borderRadius: BorderRadius.circular(AppTheme.radiusCard),
                border: Border.all(
                  color: colors.danger.withValues(alpha: 0.25),
                ),
              ),
              child: Text(
                dangerNote!,
                style: TextStyle(fontSize: 13, color: colors.danger),
              ),
            ),
          ],
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              OutlinedButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: Text(cancelLabel),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(true),
                style: danger
                    ? FilledButton.styleFrom(
                        backgroundColor: colors.danger,
                        foregroundColor: Colors.white,
                      )
                    : null,
                child: Text(confirmLabel),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
