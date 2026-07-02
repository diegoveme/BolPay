import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/app_scope.dart';
import '../../ui/theme.dart';
import '../../ui/widgets/button_spinner.dart';
import '../../ui/widgets/feedback.dart';
import '../../ui/widgets/loading_state.dart';
import 'auth_card_shell.dart';

enum _Status { verifying, success, error }

/// Email verification landing (deep link `/verify-email?token=`).
///
/// Auto-posts the token on open and mirrors the web VerifyEmailPage
/// states: verifying spinner, success ("Email verified") and error with
/// the backend message. When the user is signed in, the error state also
/// offers to resend the verification email.
class VerifyEmailScreen extends StatefulWidget {
  const VerifyEmailScreen({super.key, this.token});

  final String? token;

  @override
  State<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends State<VerifyEmailScreen> {
  _Status _status = _Status.verifying;
  String _error = '';
  bool _resending = false;

  @override
  void initState() {
    super.initState();
    final token = widget.token;
    if (token == null || token.isEmpty) {
      // Build has not run yet: assign directly instead of setState.
      _status = _Status.error;
      _error = 'The verification token is missing from the link.';
    } else {
      _verify(token);
    }
  }

  Future<void> _verify(String token) async {
    final scope = AppScope.read(context);
    try {
      await scope.auth.verifyEmail(token);
      // Refresh /auth/me so the verify banner disappears for a signed-in
      // user.
      if (scope.auth.isAuthenticated) await scope.auth.refreshUser();
      if (mounted) setState(() => _status = _Status.success);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _status = _Status.error;
        _error = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _status = _Status.error;
        _error = 'An unexpected error occurred.';
      });
    }
  }

  Future<void> _resend() async {
    setState(() => _resending = true);
    final scope = AppScope.read(context);
    try {
      final sent = await scope.auth.resendVerification();
      if (!mounted) return;
      showSuccessSnackBar(
        context,
        sent ? 'Verification email sent' : 'Your email is already verified.',
      );
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final authed = AppScope.of(context).auth.isAuthenticated;
    return AuthCardShell(
      centered: true,
      child: switch (_status) {
        _Status.verifying => const Padding(
          padding: EdgeInsets.symmetric(vertical: 24),
          child: LoadingState(label: 'Verifying your email…'),
        ),
        _Status.success => Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Icon(Icons.check_circle_outline, size: 40, color: colors.success),
            const SizedBox(height: 12),
            Text(
              'Email verified',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: colors.text,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Your email is confirmed. You can now use BolPay as usual.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: colors.textMuted),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () => context.go(authed ? '/dashboard' : '/login'),
              child: Text(authed ? 'Continue to dashboard' : 'Go to sign in'),
            ),
          ],
        ),
        _Status.error => Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Icon(Icons.error_outline, size: 40, color: colors.danger),
            const SizedBox(height: 12),
            Text(
              "We couldn't verify it",
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: colors.text,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _error,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: colors.textMuted),
            ),
            const SizedBox(height: 20),
            OutlinedButton(
              onPressed: () => context.go(authed ? '/dashboard' : '/login'),
              child: Text(authed ? 'Back to the app' : 'Back to sign in'),
            ),
            if (authed) ...[
              const SizedBox(height: 8),
              TextButton(
                onPressed: _resending ? null : _resend,
                child: _resending
                    ? const ButtonSpinner(size: 18)
                    : const Text('Resend verification email'),
              ),
            ],
          ],
        ),
      },
    );
  }
}
