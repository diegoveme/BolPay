import 'package:flutter/material.dart';

import '../../../core/api_client.dart';
import '../../../core/app_scope.dart';
import '../../../data/auth_repository.dart';
import '../../../ui/theme.dart';
import '../../../ui/widgets/feedback.dart';

/// Warning banner shown while the account email is unverified (web
/// `VerifyEmailBanner` parity). Offers a one-tap resend of the
/// verification email.
class VerifyEmailBanner extends StatefulWidget {
  const VerifyEmailBanner({super.key});

  @override
  State<VerifyEmailBanner> createState() => _VerifyEmailBannerState();
}

class _VerifyEmailBannerState extends State<VerifyEmailBanner> {
  bool _sending = false;
  bool _sent = false;

  Future<void> _resend() async {
    final scope = AppScope.read(context);
    setState(() => _sending = true);
    try {
      // The auth repository is not exposed through AppScope (the session
      // state wraps it), so the banner builds its own thin client.
      final repo = AuthRepository(
        ApiClient(tokenProvider: scope.storage.readToken),
      );
      final sent = await repo.resendVerification();
      if (!mounted) return;
      setState(() => _sent = true);
      if (sent) {
        showSuccessSnackBar(context, 'Verification email sent');
      } else {
        showSuccessSnackBar(context, 'Your email is already verified');
        await scope.auth.refreshUser();
      }
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Container(
      width: double.infinity,
      color: colors.warningBg,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              'Verify your email to enable invitations and escrow funding.',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: colors.warning,
              ),
            ),
          ),
          const SizedBox(width: 12),
          if (_sent)
            Text(
              'Verification email sent',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: colors.warning,
              ),
            )
          else
            TextButton(
              onPressed: _sending ? null : _resend,
              style: TextButton.styleFrom(
                foregroundColor: colors.warning,
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: _sending
                  ? SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: colors.warning,
                      ),
                    )
                  : const Text('Resend verification'),
            ),
        ],
      ),
    );
  }
}
