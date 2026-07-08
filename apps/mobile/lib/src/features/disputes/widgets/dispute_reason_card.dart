import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../../../domain/models/dispute.dart';
import '../../../ui/theme.dart';
import '../../../ui/widgets/app_card.dart';

/// Reason card for a dispute: the stated reason plus who opened it and when.
class DisputeReasonCard extends StatelessWidget {
  /// Creates the reason card for [dispute].
  const DisputeReasonCard({super.key, required this.dispute});

  /// Dispute whose reason and opener are displayed.
  final Dispute dispute;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return AppCard(
      title: 'Reason',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            dispute.reason,
            style: TextStyle(fontSize: 14, height: 1.5, color: colors.text),
          ),
          const SizedBox(height: 8),
          Text(
            'Opened by ${dispute.openedByEmail ?? emptyPlaceholder} · '
            '${formatDateTime(dispute.createdAt)}',
            style: TextStyle(fontSize: 13, color: colors.textMuted),
          ),
        ],
      ),
    );
  }
}
