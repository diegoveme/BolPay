import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../ui/theme.dart';
import '../../../ui/widgets/button_spinner.dart';
import 'pollar_step.dart';

/// "Continue with Pollar" button plus the in-card OTP steps. This is the
/// only place in the app allowed to show the wallet provider's name.
class PollarConnectSection extends StatelessWidget {
  const PollarConnectSection({
    super.key,
    required this.step,
    required this.busy,
    required this.emailController,
    required this.codeController,
    required this.onContinuePressed,
    required this.onSendCode,
    required this.onVerifyCode,
    required this.onUseDifferentEmail,
  });

  final PollarStep step;
  final bool busy;
  final TextEditingController emailController;
  final TextEditingController codeController;

  /// Advances to the email step ("Continue with Pollar").
  final VoidCallback onContinuePressed;
  final VoidCallback onSendCode;
  final VoidCallback onVerifyCode;

  /// Returns to the email step ("Use a different email").
  final VoidCallback onUseDifferentEmail;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Sign in with your wallet',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: colors.text,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Your wallet is created and kept for you: signing in only takes '
          'your email and a verification code.',
          style: TextStyle(fontSize: 13, color: colors.textMuted),
        ),
        const SizedBox(height: 16),
        if (step == PollarStep.none)
          FilledButton.icon(
            onPressed: busy ? null : onContinuePressed,
            icon: const Icon(Icons.account_balance_wallet_outlined, size: 18),
            label: const Text('Continue with Pollar'),
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        if (step == PollarStep.email) ...[
          TextFormField(
            controller: emailController,
            keyboardType: TextInputType.emailAddress,
            autocorrect: false,
            autofocus: true,
            decoration: const InputDecoration(
              labelText: 'Email',
              hintText: 'you@email.com',
              prefixIcon: Icon(Icons.mail_outline),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: busy ? null : onSendCode,
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            child: busy
                ? const ButtonSpinner()
                : const Text('Send verification code'),
          ),
        ],
        if (step == PollarStep.code) ...[
          Text(
            'We sent a verification code to '
            '${emailController.text.trim()}.',
            style: TextStyle(fontSize: 13, color: colors.textMuted),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: codeController,
            keyboardType: TextInputType.number,
            autocorrect: false,
            autofocus: true,
            maxLength: 8,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: const InputDecoration(
              labelText: 'Verification code',
              prefixIcon: Icon(Icons.pin_outlined),
              counterText: '',
            ),
            onFieldSubmitted: (_) => onVerifyCode(),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: busy ? null : onVerifyCode,
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            child: busy ? const ButtonSpinner() : const Text('Verify'),
          ),
          TextButton(
            onPressed: busy ? null : onUseDifferentEmail,
            child: const Text('Use a different email'),
          ),
        ],
      ],
    );
  }
}
