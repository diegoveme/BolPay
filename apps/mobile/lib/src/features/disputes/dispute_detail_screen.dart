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
import 'widgets/propose_sheet.dart';

/// Dispute detail: context, reason, evidence thread and the mutual
/// resolution flow (web parity). Either party can propose how the funds are
/// split; only the party that did NOT make the standing proposal can accept
/// it (executing it on-chain) or counter-propose.
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

  /// Propose or counter-propose a split. Proposing does not move money, so it
  /// needs no confirmation; the other party must accept before it settles.
  Future<void> _propose(Dispute dispute) async {
    final input = await showProposeSheet(context, dispute: dispute);
    if (input == null || !mounted) return;

    setState(() => _busy = true);
    try {
      await AppScope.read(context).disputes.propose(
        widget.disputeId,
        outcome: input.outcome,
        resolution: input.resolution,
        freelancerAmount: input.freelancerAmount,
        companyAmount: input.companyAmount,
      );
      if (mounted) showSuccessSnackBar(context, 'Proposal sent.');
      await _load();
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// Accept the standing proposal and execute the split on-chain. Confirmed
  /// first because it moves the escrowed funds and cannot be undone.
  Future<void> _accept(Dispute dispute) async {
    final toFreelancer = formatUsdc(dispute.proposalFreelancerAmount ?? '0');
    final toCompany = formatUsdc(dispute.proposalCompanyAmount ?? '0');
    final confirmed = await showConfirmSheet(
      context,
      title: 'Accept resolution',
      body:
          'Accepting executes the agreed split on the escrow: $toFreelancer to '
          'the freelancer and $toCompany to the company.',
      confirmLabel: 'Execute resolution',
      danger: true,
      dangerNote: 'This runs on-chain and cannot be undone.',
    );
    if (confirmed != true || !mounted) return;

    setState(() => _busy = true);
    try {
      await AppScope.read(context).disputes.accept(widget.disputeId);
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
                DisputeNegotiationCard(
                  dispute: dispute,
                  isProposer: _isProposer(dispute),
                  busy: _busy,
                  onPropose: () => _propose(dispute),
                  onAccept: () => _accept(dispute),
                ),
              ],
            ],
          ),
        ),
      },
    );
  }

  /// Whether the current user made the standing proposal. The proposer cannot
  /// accept their own proposal, so they only get to change or counter it.
  bool _isProposer(Dispute dispute) {
    final user = AppScope.of(context).auth.user;
    return user != null && user.id == dispute.proposedById;
  }
}
