import 'package:flutter/material.dart';

import '../../../core/api_config.dart';
import '../../../core/formatters.dart';
import '../../../domain/models/models.dart';
import '../../../ui/theme.dart';
import '../../../ui/widgets/feedback.dart';
import '../../../ui/widgets/status_badge.dart';

/// One milestone inside the contract detail (web milestone item parity):
/// title, amount and deadline, status badge, role-dependent actions,
/// deliverable history and the on-chain release transaction footer.
class MilestoneTile extends StatelessWidget {
  const MilestoneTile({
    super.key,
    required this.milestone,
    required this.index,
    required this.isCompany,
    required this.isFreelancer,
    required this.contractActive,
    required this.escrowFunded,
    required this.busy,
    required this.onUploadDeliverable,
    required this.onApprove,
    required this.onRequestChanges,
    required this.onOpenDispute,
    required this.onViewDispute,
  });

  final Milestone milestone;
  final int index;
  final bool isCompany;
  final bool isFreelancer;
  final bool contractActive;
  final bool escrowFunded;
  final bool busy;
  final VoidCallback onUploadDeliverable;
  final VoidCallback onApprove;
  final VoidCallback onRequestChanges;
  final VoidCallback onOpenDispute;
  final ValueChanged<String> onViewDispute;

  int get _position => milestone.position ?? index;

  MilestoneTransaction? get _releaseTx {
    for (final tx in milestone.transactions) {
      if (tx.type == 'release' && (tx.txHash ?? '').isNotEmpty) return tx;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final canUpload =
        isFreelancer && contractActive && milestone.acceptsDeliverables;
    final canReview = isCompany && milestone.isReviewable;
    final openDispute = milestone.openDispute;
    // An agreed dispute leaves the milestone out of the `disputed` status
    // (it reopens for delivery), so guard on the dispute itself: there is
    // already one in play and the backend rejects a second one.
    final canDispute =
        (isCompany || isFreelancer) &&
        contractActive &&
        !milestone.isReleased &&
        !milestone.isDisputed &&
        openDispute == null;
    final releaseTx = _releaseTx;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        border: Border.all(color: colors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${_position + 1}. ${milestone.title ?? 'Milestone'}',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: colors.text,
                      ),
                    ),
                    Text(
                      milestone.deadline == null
                          ? formatUsdc(milestone.amount)
                          : '${formatUsdc(milestone.amount)} · '
                                'due ${formatDate(milestone.deadline)}',
                      style: TextStyle(fontSize: 13, color: colors.textMuted),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              StatusBadge.milestone(milestone.status),
            ],
          ),
          if (milestone.description != null &&
              milestone.description!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              milestone.description!,
              style: TextStyle(fontSize: 13.5, color: colors.textMuted),
            ),
          ],
          if (canUpload || canReview || canDispute || openDispute != null) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                if (canUpload)
                  OutlinedButton(
                    onPressed: busy ? null : onUploadDeliverable,
                    child: Text(
                      milestone.deliverables.isNotEmpty
                          ? 'New version'
                          : 'Upload deliverable',
                    ),
                  ),
                if (canReview) ...[
                  if (escrowFunded)
                    FilledButton(
                      onPressed: busy ? null : onApprove,
                      child: const Text('Approve and pay'),
                    )
                  else
                    Text(
                      'Fund the escrow to release',
                      style: TextStyle(fontSize: 12.5, color: colors.textMuted),
                    ),
                  OutlinedButton(
                    onPressed: busy ? null : onRequestChanges,
                    child: const Text('Request changes'),
                  ),
                ],
                if (canDispute)
                  TextButton(
                    onPressed: busy ? null : onOpenDispute,
                    child: const Text('Open dispute'),
                  ),
                if (openDispute != null)
                  TextButton(
                    onPressed: () => onViewDispute(openDispute.id),
                    child: const Text('View dispute'),
                  ),
              ],
            ),
          ],
          for (final deliverable in milestone.deliverables) ...[
            const SizedBox(height: 10),
            _DeliverableItem(deliverable: deliverable),
          ],
          if (releaseTx != null) ...[
            const SizedBox(height: 10),
            _ReleaseTxLine(txHash: releaseTx.txHash!),
          ],
        ],
      ),
    );
  }
}

class _DeliverableItem extends StatelessWidget {
  const _DeliverableItem({required this.deliverable});

  final Deliverable deliverable;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
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
          Wrap(
            spacing: 8,
            runSpacing: 4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                'v${deliverable.version ?? 1}',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: colors.text,
                ),
              ),
              StatusBadge(
                status: deliverable.status ?? 'submitted',
                kind: StatusKind.deliverable,
              ),
              Text(
                formatDate(deliverable.createdAt),
                style: TextStyle(fontSize: 13, color: colors.textMuted),
              ),
            ],
          ),
          if (deliverable.note != null && deliverable.note!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              deliverable.note!,
              style: TextStyle(fontSize: 13.5, color: colors.text),
            ),
          ],
          if (deliverable.linkUrl != null && deliverable.linkUrl!.isNotEmpty)
            _CopyLink(url: deliverable.linkUrl!, label: deliverable.linkUrl!),
          if (deliverable.fileUrl != null && deliverable.fileUrl!.isNotEmpty)
            _CopyLink(url: deliverable.fileUrl!, label: 'file'),
          if (deliverable.reviewNote != null &&
              deliverable.reviewNote!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              'Feedback: ${deliverable.reviewNote}',
              style: TextStyle(fontSize: 13, color: colors.textMuted),
            ),
          ],
        ],
      ),
    );
  }
}

/// Tappable link that copies the URL to the clipboard (the mobile app
/// has no in-app browser dependency).
class _CopyLink extends StatelessWidget {
  const _CopyLink({required this.url, required this.label});

  final String url;
  final String label;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return InkWell(
      onTap: () =>
          copyToClipboard(context, url, message: 'Link copied to clipboard'),
      child: Padding(
        padding: const EdgeInsets.only(top: 4),
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 13,
            color: colors.primary,
            fontFamily: 'monospace',
          ),
        ),
      ),
    );
  }
}

/// "On-chain payment" footer: simulated hashes render as plain text with
/// the "(simulated)" suffix; real hashes copy their stellar.expert link.
class _ReleaseTxLine extends StatelessWidget {
  const _ReleaseTxLine({required this.txHash});

  final String txHash;

  bool get _isSimulated => txHash.startsWith('SIM');

  String get _explorerUrl {
    const network =
        ApiConfig.stellarNetwork == 'public' ||
            ApiConfig.stellarNetwork == 'mainnet'
        ? 'public'
        : 'testnet';
    return 'https://stellar.expert/explorer/$network/tx/$txHash';
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final mono = TextStyle(
      fontSize: 12.5,
      fontFamily: 'monospace',
      color: _isSimulated ? colors.textMuted : colors.primary,
    );
    return Wrap(
      spacing: 4,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Text(
          'On-chain payment:',
          style: TextStyle(fontSize: 12.5, color: colors.textMuted),
        ),
        if (_isSimulated)
          Text('${shortAddress(txHash)} (simulated)', style: mono)
        else
          InkWell(
            onTap: () => copyToClipboard(
              context,
              _explorerUrl,
              message: 'Explorer link copied to clipboard',
            ),
            child: Text(shortAddress(txHash), style: mono),
          ),
      ],
    );
  }
}
