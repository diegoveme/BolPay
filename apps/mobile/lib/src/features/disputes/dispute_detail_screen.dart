import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/app_scope.dart';
import '../../core/formatters.dart';
import '../../domain/models/dispute.dart';
import '../../ui/widgets/confirm_sheet.dart';
import '../../ui/widgets/error_state.dart';
import '../../ui/widgets/feedback.dart';
import '../../ui/widgets/loading_state.dart';
import '../../ui/widgets/section_header.dart';
import '../../ui/widgets/status_badge.dart';
import 'widgets/dispute_context_card.dart';
import 'widgets/dispute_evidence_thread.dart';
import 'widgets/dispute_reason_card.dart';
import 'widgets/dispute_resolution_section.dart';
import 'widgets/evidence_sheet.dart';
import 'widgets/resolve_sheet.dart';

/// Dispute detail: context, reason, evidence thread and the mutual
/// resolution flow (web parity). The party who opened the dispute cannot
/// resolve it; an administrator can resolve escalated disputes.
class DisputeDetailScreen extends StatefulWidget {
  const DisputeDetailScreen({super.key, required this.disputeId});

  final String disputeId;

  @override
  State<DisputeDetailScreen> createState() => _DisputeDetailScreenState();
}

class _DisputeDetailScreenState extends State<DisputeDetailScreen> {
  Dispute? _dispute;
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _dispute = null;
      _error = null;
    });
    try {
      final dispute = await AppScope.read(
        context,
      ).disputes.byId(widget.disputeId);
      if (mounted) setState(() => _dispute = dispute);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'An unexpected error occurred.');
    }
  }

  Future<void> _addEvidence() async {
    final input = await showEvidenceSheet(context);
    if (input == null || !mounted) return;
    setState(() => _busy = true);
    try {
      await AppScope.read(context).disputes.addEvidence(
        widget.disputeId,
        fileUrl: input.fileUrl,
        comment: input.comment,
      );
      if (mounted) showSuccessSnackBar(context, 'Evidence attached.');
      await _load();
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _resolve(Dispute dispute) async {
    final input = await showResolveSheet(context, dispute: dispute);
    if (input == null || !mounted) return;

    final amount = formatUsdc(dispute.milestone?.amount);
    final (confirmLabel, body) = switch (input.outcome) {
      'release_to_freelancer' => (
        'Release $amount to the freelancer',
        'The full $amount held in escrow will be released to the '
            "freelancer's wallet.",
      ),
      'refund_to_company' => (
        'Refund $amount to the company',
        'The full $amount held in escrow will be refunded to the '
            "company's wallet.",
      ),
      _ => (
        'Split $amount',
        'The escrow will send ${formatUsdc(input.freelancerAmount)} to the '
            'freelancer and ${formatUsdc(input.companyAmount)} to the '
            'company.',
      ),
    };
    final confirmed = await showConfirmSheet(
      context,
      title: 'Resolve dispute',
      body: body,
      confirmLabel: confirmLabel,
      danger: true,
      dangerNote: 'The resolution is executed on-chain and cannot be undone.',
    );
    if (confirmed != true || !mounted) return;

    setState(() => _busy = true);
    try {
      await AppScope.read(context).disputes.resolve(
        widget.disputeId,
        outcome: input.outcome,
        resolution: input.resolution,
        freelancerAmount: input.freelancerAmount,
        companyAmount: input.companyAmount,
      );
      if (mounted) showSuccessSnackBar(context, 'Dispute resolved.');
      await _load();
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Dispute')),
      body: switch ((_dispute, _error)) {
        (null, null) => const LoadingState(label: 'Loading dispute…'),
        (null, final String error) => ErrorState(
          message: error,
          onRetry: _load,
        ),
        (final Dispute dispute, _) => RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            children: [
              SectionHeader(
                title:
                    'Dispute · ${dispute.milestone?.title ?? emptyPlaceholder}',
                subtitle:
                    'Contract '
                    '${dispute.milestone?.contractTitle ?? emptyPlaceholder} '
                    '· ${formatUsdc(dispute.milestone?.amount)} at stake',
                trailing: StatusBadge.dispute(dispute.status),
              ),
              const SizedBox(height: 16),
              DisputeContextCard(
                dispute: dispute,
                onViewContract: dispute.milestone?.contractId != null
                    ? () => context.go(
                        '/contracts/${dispute.milestone!.contractId}',
                      )
                    : null,
              ),
              const SizedBox(height: 16),
              DisputeReasonCard(dispute: dispute),
              if (dispute.isResolved) ...[
                const SizedBox(height: 16),
                DisputeResolutionCard(dispute: dispute),
              ],
              const SizedBox(height: 16),
              DisputeEvidenceThread(
                dispute: dispute,
                busy: _busy,
                onAddEvidence: _addEvidence,
              ),
              if (dispute.isOpen) ...[
                const SizedBox(height: 16),
                DisputeResolveCard(
                  canResolve: _canResolve(dispute),
                  busy: _busy,
                  onResolve: () => _resolve(dispute),
                ),
              ],
            ],
          ),
        ),
      },
    );
  }

  /// Who may resolve an open dispute: the counterparty settles it, and an
  /// administrator can resolve it once escalated. The opener never resolves
  /// their own.
  bool _canResolve(Dispute dispute) {
    final user = AppScope.of(context).auth.user;
    final isOpener = user != null && user.id == dispute.openedById;
    final isAdmin = user?.role == 'administrator';
    return user != null &&
        ((!isOpener && dispute.isOpen) ||
            (isAdmin && dispute.status == 'escalated'));
  }
}
