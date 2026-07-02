import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../../../domain/models/dispute.dart';
import '../../../ui/theme.dart';
import '../../../ui/widgets/app_card.dart';

/// Evidence thread for a dispute: the list of evidence entries and, while
/// the dispute is open, the action to attach more.
class DisputeEvidenceThread extends StatelessWidget {
  const DisputeEvidenceThread({
    super.key,
    required this.dispute,
    required this.busy,
    required this.onAddEvidence,
  });

  final Dispute dispute;
  final bool busy;
  final VoidCallback onAddEvidence;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return AppCard(
      title: 'Evidence and comments (${dispute.evidence.length})',
      actions: [
        if (dispute.isOpen)
          TextButton(
            onPressed: busy ? null : onAddEvidence,
            child: const Text('Add evidence'),
          ),
      ],
      child: dispute.evidence.isEmpty
          ? Text(
              'No evidence attached yet.',
              style: TextStyle(fontSize: 13, color: colors.textMuted),
            )
          : Column(
              children: [
                for (var i = 0; i < dispute.evidence.length; i++) ...[
                  if (i > 0) const SizedBox(height: 10),
                  _EvidenceTile(item: dispute.evidence[i], colors: colors),
                ],
              ],
            ),
    );
  }
}

class _EvidenceTile extends StatelessWidget {
  const _EvidenceTile({required this.item, required this.colors});

  final DisputeEvidence item;
  final AppColors colors;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: colors.surface2,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        border: Border.all(color: colors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  item.submitterEmail ?? emptyPlaceholder,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: colors.text,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                formatDateTime(item.createdAt),
                style: TextStyle(fontSize: 12, color: colors.textMuted),
              ),
            ],
          ),
          if (item.comment != null && item.comment!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              item.comment!,
              style: TextStyle(fontSize: 14, height: 1.5, color: colors.text),
            ),
          ],
          if (item.fileUrl != null && item.fileUrl!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              item.fileUrl!,
              style: TextStyle(
                fontSize: 12.5,
                fontFamily: 'monospace',
                color: colors.primary,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
