import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../../../domain/models/activity_log.dart';
import '../../../ui/theme.dart';
import 'admin_empty_list.dart';

/// Activity tab table: one row per global activity log, or an empty
/// placeholder.
class AdminActivityTable extends StatelessWidget {
  const AdminActivityTable({super.key, required this.activity});

  final List<ActivityLog> activity;

  @override
  Widget build(BuildContext context) {
    if (activity.isEmpty) return const AdminEmptyList(title: 'No activity');
    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      itemCount: activity.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, index) => _ActivityRow(log: activity[index]),
    );
  }
}

/// Activity tab row: raw event key, acting user and datetime.
class _ActivityRow extends StatelessWidget {
  const _ActivityRow({required this.log});

  final ActivityLog log;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            log.event,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              fontFamily: 'monospace',
              color: colors.text,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            '${log.userEmail ?? emptyPlaceholder} · '
            '${formatDateTime(log.createdAt)}',
            style: TextStyle(fontSize: 12, color: colors.textMuted),
          ),
        ],
      ),
    );
  }
}
