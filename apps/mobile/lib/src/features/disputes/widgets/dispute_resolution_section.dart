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

/// Shown while a dispute is `agreed`: both parties settled on a split, but no
/// funds have moved. The freelancer still has to deliver on the contract and
/// the company to approve it before the escrow pays out those amounts.
class DisputeAgreementCard extends StatelessWidget {
  const DisputeAgreementCard({
    super.key,
    required this.dispute,
    this.onViewContract,
  });

  final Dispute dispute;
  final VoidCallback? onViewContract;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return AppCard(
      title: 'Agreement reached',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'You agreed on the split, but no funds have moved yet. The '
            'freelancer delivers the work on the contract; once the company '
            'approves it, the escrow releases the agreed amounts.',
            style: TextStyle(fontSize: 13.5, color: colors.textMuted),
          ),
          const SizedBox(height: 12),
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
          if (dispute.resolution != null && dispute.resolution!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              dispute.resolution!,
              style: TextStyle(fontSize: 14, height: 1.5, color: colors.text),
            ),
          ],
          if (onViewContract != null) ...[
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: onViewContract,
              child: const Text('Go to the contract'),
            ),
          ],
        ],
      ),
    );
  }
}

/// Explains the standing proposal to whoever is looking at it. A proposal that
/// pays the freelancer does not settle on accept (it locks in the agreement and
/// reopens the milestone); a pure refund to the company runs right away.
String _proposalSummary(Dispute dispute, bool isProposer) {
  final other = dispute.proposedByEmail ?? 'The other party';
  if (isProposer) {
    return dispute.proposalPaysFreelancer
        ? 'You proposed this split. Once the other party accepts, the '
              'freelancer delivers the work and the company approves it before '
              'the escrow pays out. You can change it below.'
        : 'You proposed this refund. It runs on the escrow as soon as the '
              'other party accepts. You can change it below.';
  }
  return dispute.proposalPaysFreelancer
      ? '$other proposed this split. Accept it to lock it in: the freelancer '
            'then delivers and the company approves before any funds move. Or '
            'counter with your own.'
      : '$other proposed this refund. Accept it to run it on the escrow now, '
            'or counter with your own.';
}

/// Mutual resolution flow shown while a dispute is open. With no standing
/// proposal, either party can propose a split. Once a proposal exists it is
/// shown here; the party that did NOT make it can accept or counter-propose,
/// and the proposer can change it.
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
            _proposalSummary(dispute, isProposer),
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
              child: Text(
                dispute.proposalPaysFreelancer
                    ? 'Accept agreement'
                    : 'Accept and refund',
              ),
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
