import 'package:flutter/material.dart';

import '../../../ui/theme.dart';

/// Info hint shown when an invitation token was stashed by the
/// accept-invite deep link.
class InvitationBanner extends StatelessWidget {
  const InvitationBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: colors.infoBg,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        border: Border.all(color: colors.info.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          Icon(Icons.mark_email_read_outlined, size: 18, color: colors.info),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'You are joining from an invitation. It will be applied '
              'automatically when you sign in.',
              style: TextStyle(fontSize: 13, color: colors.info),
            ),
          ),
        ],
      ),
    );
  }
}
