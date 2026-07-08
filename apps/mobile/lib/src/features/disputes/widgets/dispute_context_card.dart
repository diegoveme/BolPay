import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../../../domain/models/dispute.dart';
import '../../../ui/widgets/app_card.dart';
import '../../../ui/widgets/detail_row.dart';

/// Context card for a dispute: the related contract, milestone, amount at
/// stake and who opened it, with a shortcut to the full contract.
class DisputeContextCard extends StatelessWidget {
  const DisputeContextCard({
    super.key,
    required this.dispute,
    this.onViewContract,
  });

  final Dispute dispute;
  final VoidCallback? onViewContract;

  @override
  Widget build(BuildContext context) {
    final milestone = dispute.milestone;
    return AppCard(
      title: 'Contract',
      actions: [
        if (onViewContract != null)
          TextButton(
            onPressed: onViewContract,
            child: const Text('View contract'),
          ),
      ],
      child: Column(
        children: [
          DetailRow(
            label: 'Contract',
            value: milestone?.contractTitle ?? emptyPlaceholder,
          ),
          DetailRow(
            label: 'Milestone',
            value: milestone?.title ?? emptyPlaceholder,
          ),
          DetailRow(
            label: 'Amount at stake',
            value: formatUsdc(milestone?.amount),
            mono: true,
          ),
          DetailRow(
            label: 'Opened by',
            value: dispute.openedByEmail ?? emptyPlaceholder,
          ),
        ],
      ),
    );
  }
}
