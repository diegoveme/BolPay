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
            label: 'Accepted by',
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

/// Mutual resolution flow shown while a dispute is open. With no standing
/// proposal, either party can propose a split. Once a proposal exists it is
/// shown here; the party that did NOT make it can accept (executing it on the
/// escrow) or counter-propose, and the proposer can change it.
class DisputeNegotiationCard extends StatelessWidget {
  const DisputeNegotiationCard({
    super.key,
    required this.dispute,
    required this.isProposer,
    required this.busy,
    required this.onPropose,
    required this.onAccept,
  });

  final Dispute dispute;
  final bool isProposer;
  final bool busy;

  /// Opens the propose sheet (a fresh proposal, a counter, or a change).
  final VoidCallback onPropose;

  /// Confirms and executes the standing proposal on-chain.
  final VoidCallback onAccept;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    if (!dispute.hasProposal) {
      return AppCard(
        title: 'Resolution',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'You settle this between yourselves: propose how the '
              '${formatUsdc(dispute.milestone?.amount)} in escrow is split. '
              'It only executes once the other party accepts.',
              style: TextStyle(fontSize: 13.5, color: colors.textMuted),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: busy ? null : onPropose,
              child: const Text('Propose a resolution'),
            ),
          ],
        ),
      );
    }
    return AppCard(
      title: 'Resolution',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isProposer
                ? 'You proposed this split. It runs on the escrow once the '
                      'other party accepts. You can change it below.'
                : '${dispute.proposedByEmail ?? 'The other party'} proposed '
                      'this split. Accept it to execute on the escrow, or '
                      'counter with your own.',
            style: TextStyle(fontSize: 13.5, color: colors.textMuted),
          ),
          const SizedBox(height: 12),
          DetailRow(
            label: 'To the freelancer',
            value: formatUsdc(dispute.proposalFreelancerAmount ?? '0'),
            mono: true,
          ),
          DetailRow(
            label: 'To the company',
            value: formatUsdc(dispute.proposalCompanyAmount ?? '0'),
            mono: true,
          ),
          if (dispute.proposalNote != null &&
              dispute.proposalNote!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              dispute.proposalNote!,
              style: TextStyle(fontSize: 14, height: 1.5, color: colors.text),
            ),
          ],
          const SizedBox(height: 14),
          if (!isProposer) ...[
            FilledButton(
              onPressed: busy ? null : onAccept,
              child: const Text('Accept and execute'),
            ),
            const SizedBox(height: 8),
          ],
          OutlinedButton(
            onPressed: busy ? null : onPropose,
            child: Text(isProposer ? 'Change proposal' : 'Counter-propose'),
          ),
        ],
      ),
    );
  }
}
