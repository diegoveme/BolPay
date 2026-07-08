import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../ui/theme.dart';
import '../../../ui/widgets/button_spinner.dart';

/// Six-digit email code step for the manual (self-declared wallet) sign-in.
///
/// Shown after the user submits their email and Stellar address: the backend
/// emails a code that must be confirmed here before the session is created,
/// proving the address belongs to the person signing in.
class ManualCodeStep extends StatelessWidget {
  const ManualCodeStep({
    super.key,
    required this.email,
    required this.busy,
    required this.codeController,
    required this.onVerify,
    required this.onEditEmail,
    required this.onResend,
  });

  final String email;
  final bool busy;
  final TextEditingController codeController;
  final VoidCallback onVerify;

  /// Returns to the identity form to correct the email.
  final VoidCallback onEditEmail;

  /// Requests a fresh code for the same email.
  final VoidCallback onResend;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Confirm your email',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: colors.text,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'We sent a verification code to $email. Enter it to finish '
          'signing in.',
          style: TextStyle(fontSize: 13, color: colors.textMuted),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: codeController,
          keyboardType: TextInputType.number,
          autocorrect: false,
          autofocus: true,
          maxLength: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: const InputDecoration(
            labelText: 'Verification code',
            prefixIcon: Icon(Icons.pin_outlined),
            counterText: '',
          ),
          onFieldSubmitted: (_) => onVerify(),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: busy ? null : onVerify,
          style: FilledButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
          child: busy ? const ButtonSpinner() : const Text('Verify and sign in'),
        ),
        // OverflowBar stacks the two actions on narrow screens instead of
        // overflowing the row.
        OverflowBar(
          alignment: MainAxisAlignment.spaceBetween,
          children: [
            TextButton(
              onPressed: busy ? null : onEditEmail,
              child: const Text('Change email'),
            ),
            TextButton(
              onPressed: busy ? null : onResend,
              child: const Text('Resend code'),
            ),
          ],
        ),
      ],
    );
  }
}
