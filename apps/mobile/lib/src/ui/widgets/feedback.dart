import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/api_client.dart';
import '../theme.dart';

/// Shows an error snackbar with the backend message when available
/// ([ApiException]) or a generic message otherwise.
void showErrorSnackBar(BuildContext context, Object error) {
  final message = error is ApiException
      ? error.message
      : 'An unexpected error occurred.';
  final colors = AppColors.of(context);
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text(message, style: const TextStyle(color: Colors.white)),
        backgroundColor: colors.danger,
      ),
    );
}

/// Success confirmation snackbar.
void showSuccessSnackBar(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}

/// Copies [value] to the system clipboard and shows a success snackbar.
Future<void> copyToClipboard(
  BuildContext context,
  String value, {
  String message = 'Copied',
}) async {
  await Clipboard.setData(ClipboardData(text: value));
  if (context.mounted) showSuccessSnackBar(context, message);
}
