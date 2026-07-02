import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/app_scope.dart';
import '../../ui/theme.dart';
import 'auth_card_shell.dart';

/// Invitation landing (deep link `/accept-invite?token=`).
///
/// Web AcceptInvitePage parity: no API call. Stashes the token so the
/// login flow can attach it as `invitationToken`, then sends the user to
/// sign in (the router bounces an already-authenticated user to the
/// dashboard, exactly like the web).
class AcceptInviteScreen extends StatefulWidget {
  const AcceptInviteScreen({super.key, this.token});

  final String? token;

  @override
  State<AcceptInviteScreen> createState() => _AcceptInviteScreenState();
}

class _AcceptInviteScreenState extends State<AcceptInviteScreen> {
  bool get _hasToken => widget.token != null && widget.token!.isNotEmpty;

  @override
  void initState() {
    super.initState();
    if (_hasToken) {
      AppScope.read(context).storage.saveInvitationToken(widget.token!);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return AuthCardShell(
      centered: true,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 12),
          Icon(
            _hasToken ? Icons.mail_outline : Icons.error_outline,
            size: 40,
            color: _hasToken ? colors.primary : colors.danger,
          ),
          const SizedBox(height: 12),
          Text(
            "You've been invited to BolPay",
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: colors.text,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _hasToken
                ? 'Sign in to accept your invitation and create your '
                      'account. We will apply the invitation automatically.'
                : 'The invitation link is invalid or incomplete.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: colors.textMuted),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _hasToken ? () => context.go('/login') : null,
            child: const Text('Continue to sign in'),
          ),
        ],
      ),
    );
  }
}
