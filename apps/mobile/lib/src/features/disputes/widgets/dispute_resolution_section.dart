import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../../../domain/models/dispute.dart';
import '../../../ui/theme.dart';
import '../../../ui/widgets/app_card.dart';
import '../../../ui/widgets/detail_row.dart';

/// Read-only resolution summary shown once a dispute is resolved: how the
/// escrow was split, who resolved it and the agreement note.
class DisputeResolutionCard extends StatelessWidget {
  const DisputeResolutionCard({super.key, required this.dispute});

  final Dispute dispute;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return AppCard(
      title: 'Resolution',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DetailRow(
            label: 'To the freelancer',
            value: formatUsdc(dispute.freelancerAmount ?? '0'),
            mono: true,
          ),
          DetailRow(
            label: 'To the company',
            value: formatUsdc(dispute.companyAmount ?? '0'),
            mono: true,
          ),
          DetailRow(
            label: 'Resolved by',
            value: dispute.resolvedByEmail ?? emptyPlaceholder,
          ),
          if (dispute.resolution != null && dispute.resolution!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              dispute.resolution!,
              style: TextStyle(fontSize: 14, height: 1.5, color: colors.text),
            ),
          ],
        ],
      ),
    );
  }
}

/// Resolution flow shown while a dispute is open: explains who can settle
/// it and, when the viewer is allowed, the action to resolve it.
class DisputeResolveCard extends StatelessWidget {
  const DisputeResolveCard({
    super.key,
    required this.canResolve,
    required this.busy,
    required this.onResolve,
  });

  final bool canResolve;
  final bool busy;
  final VoidCallback onResolve;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return AppCard(
      title: 'Resolution',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            canResolve
                ? 'You settle this between yourselves: review the evidence '
                      'and, if you agree, accept how the funds are split. '
                      'The company signs the resolution with its wallet.'
                : 'Once the other party accepts a resolution, it will be '
                      'executed on the escrow. You can keep attaching '
                      'evidence and negotiating.',
            style: TextStyle(fontSize: 13.5, color: colors.textMuted),
          ),
          if (canResolve) ...[
            const SizedBox(height: 12),
            FilledButton(
              onPressed: busy ? null : onResolve,
              child: const Text('Resolve dispute'),
            ),
          ],
        ],
      ),
    );
  }
}
