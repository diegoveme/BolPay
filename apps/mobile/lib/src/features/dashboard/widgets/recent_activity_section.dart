import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../../../domain/models/activity_log.dart';
import '../../../ui/theme.dart';
import '../../../ui/widgets/app_card.dart';
import '../../../ui/widgets/empty_state.dart';
import '../../../ui/widgets/loading_state.dart';

/// "Recent activity" card: shows a loading state while [activity] is
/// null, an empty state when there is none, or up to eight activity rows.
class RecentActivitySection extends StatelessWidget {
  const RecentActivitySection({super.key, required this.activity});

  final List<ActivityLog>? activity;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      title: 'Recent activity',
      child: activity == null
          ? const LoadingState()
          : activity!.isEmpty
          ? const EmptyState(title: 'No activity recorded yet')
          : Column(
              children: [
                for (final log in activity!.take(8)) _ActivityRow(log: log),
              ],
            ),
    );
  }
}

/// One row of the "Recent activity" card: label + datetime.
class _ActivityRow extends StatelessWidget {
  const _ActivityRow({required this.log});

  final ActivityLog log;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(
            child: Text(
              activityLabel(log.event),
              style: TextStyle(fontSize: 14, color: colors.text),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            formatDateTime(log.createdAt),
            style: TextStyle(fontSize: 12, color: colors.textMuted),
          ),
        ],
      ),
    );
  }
}
