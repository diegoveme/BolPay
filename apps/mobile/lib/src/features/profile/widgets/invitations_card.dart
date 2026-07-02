import 'package:flutter/material.dart';

import '../../../core/app_scope.dart';
import '../../../core/formatters.dart';
import '../../../domain/models/invitation.dart';
import '../../../ui/theme.dart';
import '../../../ui/widgets/app_card.dart';
import '../../../ui/widgets/button_spinner.dart';
import '../../../ui/widgets/confirm_sheet.dart';
import '../../../ui/widgets/feedback.dart';
import '../../../ui/widgets/status_badge.dart';

/// Email invitations manager (web `InvitationsCard` parity): create
/// role-scoped invites (the code is copied to the clipboard) and
/// list/revoke pending ones. Shown to companies and administrators.
class InvitationsCard extends StatefulWidget {
  const InvitationsCard({super.key, required this.isAdministrator});

  /// Administrators can also invite other administrators.
  final bool isAdministrator;

  @override
  State<InvitationsCard> createState() => _InvitationsCardState();
}

class _InvitationsCardState extends State<InvitationsCard> {
  final _emailController = TextEditingController();
  String _role = 'fixed_employee';
  List<Invitation>? _invitations;
  bool _inviting = false;
  bool _revoking = false;

  @override
  void initState() {
    super.initState();
    _emailController.addListener(() => setState(() {}));
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (!mounted) return;
    try {
      final invitations = await AppScope.read(context).users.invitations();
      if (mounted) setState(() => _invitations = invitations);
    } catch (_) {
      // Silent: the list simply stays empty until a reload succeeds.
    }
  }

  Future<void> _invite() async {
    if (_inviting) return;
    final repo = AppScope.read(context).users;
    setState(() => _inviting = true);
    try {
      final invitation = await repo.createInvitation(
        email: _emailController.text.trim().toLowerCase(),
        role: _role,
      );
      if (!mounted) return;
      _emailController.clear();
      final token = invitation.token;
      const message = 'Invitation created · code copied to clipboard';
      if (token != null && token.isNotEmpty) {
        await copyToClipboard(context, token, message: message);
      } else if (mounted) {
        showSuccessSnackBar(context, message);
      }
      await _load();
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    } finally {
      if (mounted) setState(() => _inviting = false);
    }
  }

  Future<void> _revoke(Invitation invitation) async {
    if (_revoking) return;
    final confirmed = await showConfirmSheet(
      context,
      title: 'Revoke invitation',
      body:
          'The invitation for ${invitation.email} will no longer be '
          'usable.',
      confirmLabel: 'Revoke',
      danger: true,
    );
    if (confirmed != true || !mounted) return;
    setState(() => _revoking = true);
    try {
      await AppScope.read(context).users.revokeInvitation(invitation.id);
      await _load();
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    } finally {
      if (mounted) setState(() => _revoking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    // Companies invite the people they work with (freelancers and fixed
    // employees); only administrators can invite companies or other
    // administrators.
    final roleOptions = <(String, String)>[
      ('fixed_employee', 'Fixed employee'),
      ('freelancer', 'Freelancer'),
      if (widget.isAdministrator) ...[
        ('company', 'Company'),
        ('administrator', 'Administrator'),
      ],
    ];
    final invitations = _invitations ?? const <Invitation>[];

    return AppCard(
      title: 'Email invitations',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            autocorrect: false,
            decoration: const InputDecoration(
              labelText: 'Email',
              hintText: 'new@email.com',
            ),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _role,
            decoration: const InputDecoration(labelText: 'Role'),
            items: [
              for (final (value, label) in roleOptions)
                DropdownMenuItem(value: value, child: Text(label)),
            ],
            onChanged: (value) {
              if (value != null) setState(() => _role = value);
            },
          ),
          const SizedBox(height: 14),
          FilledButton(
            onPressed: (_inviting || !_emailController.text.contains('@'))
                ? null
                : _invite,
            child: _inviting
                ? const ButtonSpinner(size: 16, color: Colors.white)
                : const Text('Invite'),
          ),
          if (invitations.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Divider(),
            for (final invitation in invitations)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            invitation.email,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: colors.text,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${statusLabel(StatusKind.role, invitation.role)}'
                            ' · expires ${formatDate(invitation.expiresAt)}',
                            style: TextStyle(
                              fontSize: 12,
                              color: colors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    StatusBadge.invitation(invitation.status),
                    if (invitation.status == 'pending') ...[
                      const SizedBox(width: 4),
                      TextButton(
                        onPressed: _revoking ? null : () => _revoke(invitation),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 6,
                          ),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text('Revoke'),
                      ),
                    ],
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }
}
