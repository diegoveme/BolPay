import 'package:flutter/material.dart';

import '../../ui/theme.dart';

/// Centered auth card shared by the public screens (login, verify email,
/// accept invite): BolPay wordmark on top of a bordered surface card,
/// mirroring the web `login-card` (max-width 440, padding 32, radius 8).
class AuthCardShell extends StatelessWidget {
  const AuthCardShell({super.key, required this.child, this.centered = false});

  final Widget child;

  /// Center-aligns the wordmark and content (result/landing screens).
  final bool centered;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Scaffold(
      backgroundColor: colors.bg,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: colors.surface,
                  borderRadius: BorderRadius.circular(AppTheme.radiusCard),
                  border: Border.all(color: colors.border),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: centered
                      ? CrossAxisAlignment.center
                      : CrossAxisAlignment.stretch,
                  children: [
                    _Wordmark(centered: centered),
                    const SizedBox(height: 10),
                    child,
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// "BolPay" wordmark with the wallet mark: "Bol" in text color and "Pay"
/// in primary, like the web logo.
class _Wordmark extends StatelessWidget {
  const _Wordmark({required this.centered});

  final bool centered;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Row(
      mainAxisAlignment: centered
          ? MainAxisAlignment.center
          : MainAxisAlignment.start,
      children: [
        Icon(
          Icons.account_balance_wallet_outlined,
          size: 28,
          color: colors.primary,
        ),
        const SizedBox(width: 8),
        Text.rich(
          TextSpan(
            children: [
              TextSpan(
                text: 'Bol',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: colors.text,
                ),
              ),
              TextSpan(
                text: 'Pay',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: colors.primary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
