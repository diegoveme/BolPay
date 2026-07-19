import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/app_scope.dart';
import '../../core/formatters.dart';
import '../../core/wallet_signing.dart';
import '../../domain/models/models.dart';
import '../../ui/theme.dart';
import '../../ui/widgets/app_card.dart';
import '../../ui/widgets/confirm_sheet.dart';
import '../../ui/widgets/error_state.dart';
import '../../ui/widgets/feedback.dart';
import '../../ui/widgets/loading_state.dart';
import 'deliverable_form_sheet.dart';
import 'widgets/contract_parties_card.dart';
import 'widgets/contract_summary_header.dart';
import 'widgets/escrow_panel.dart';
import 'widgets/milestones_section.dart';
import 'widgets/text_input_sheet.dart';

/// Contract detail (web `/contracts/:id` parity): parties, description,
/// lifecycle actions, escrow panel, non-custodial funding and the
/// milestone list with deliverables, reviews and disputes.
class ContractDetailScreen extends StatefulWidget {
  const ContractDetailScreen({super.key, required this.contractId});

  final String contractId;

  @override
  State<ContractDetailScreen> createState() => _ContractDetailScreenState();
}

class _ContractDetailScreenState extends State<ContractDetailScreen> {
  Contract? _contract;
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final contract = await AppScope.read(
        context,
      ).contracts.detail(widget.contractId);
      if (mounted) setState(() => _contract = contract);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'An unexpected error occurred.');
    }
  }

  /// Runs a mutation with the shared busy flag, error snackbar and reload.
  Future<void> _run(
    Future<bool> Function() action, {
    String? successMessage,
  }) async {
    setState(() => _busy = true);
    try {
      final completed = await action();
      if (completed && successMessage != null && mounted) {
        showSuccessSnackBar(context, successMessage);
      }
      await _load();
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  // ---------------------------------------------------------------------
  // Company lifecycle actions
  // ---------------------------------------------------------------------

  Future<void> _send() async {
    final confirmed = await showConfirmSheet(
      context,
      title: 'Send contract to the freelancer',
      body:
          'The contract will be sent to the freelancer for acceptance. '
          'While you wait for their response you will not be able to '
          'edit it.',
      confirmLabel: 'Send to freelancer',
    );
    if (confirmed != true || !mounted) return;
    final repo = AppScope.read(context).contracts;
    await _run(() async {
      await repo.send(widget.contractId);
      return true;
    });
  }

  Future<void> _fund(Contract contract) async {
    final amount = formatUsdc(contract.totalAmount);
    final confirmed = await showConfirmSheet(
      context,
      title: 'Fund escrow',
      body:
          'You are about to fund the escrow with $amount from your '
          'wallet. You sign the transaction with your own wallet.',
      confirmLabel: 'Fund $amount',
      dangerNote:
          'The funds stay locked in the escrow until you approve each '
          'milestone.',
    );
    if (confirmed != true || !mounted) return;
    final repo = AppScope.read(context).contracts;
    await _run(() async {
      final xdr = await repo.prepareFund(widget.contractId);
      if (!mounted) return false;
      // Simulated mode continues unsigned; a custodial session signs and
      // broadcasts the XDR and its hash goes to the confirm call.
      final sign = await resolveSignature(context, xdr);
      if (!sign.canProceed) return false;
      await repo.confirmFund(widget.contractId, txHash: sign.txHash);
      return true;
    }, successMessage: 'Escrow funded successfully');
  }

  Future<void> _approve(Milestone milestone) async {
    final amount = formatUsdc(milestone.amount);
    // With an agreed dispute on the milestone, approving settles the split
    // both parties signed off on, not the full milestone amount.
    final agreed = milestone.agreedDispute;
    final toFreelancer = formatUsdc(agreed?.freelancerAmount ?? '0');
    final toCompany = formatUsdc(agreed?.companyAmount ?? '0');
    final confirmed = await showConfirmSheet(
      context,
      title: 'Approve milestone',
      body: agreed != null
          ? 'Approving ${milestone.title ?? 'this milestone'} settles the '
                'agreed dispute split from the escrow: $toFreelancer to the '
                'freelancer and $toCompany back to the company.'
          : 'Approving ${milestone.title ?? 'this milestone'} releases '
                '$amount from the escrow to the freelancer\'s wallet.',
      confirmLabel: agreed != null
          ? 'Settle $toFreelancer'
          : 'Release $amount',
      danger: true,
      dangerNote: agreed != null
          ? 'BolPay executes the agreed resolution on-chain. The settlement '
                'is irreversible.'
          : 'Your wallet will ask you to sign the approval; BolPay then '
                'releases the funds to the freelancer. The payment is '
                'irreversible.',
    );
    if (confirmed != true || !mounted) return;
    final repo = AppScope.read(context).milestones;
    await _run(() async {
      // The company signs ONLY the approval; the platform then executes the
      // release to the freelancer (a single signature covers approve + payout).
      final approveXdr = await repo.prepareApprove(milestone.id);
      if (!mounted) return false;
      final approveSign = await resolveSignature(context, approveXdr);
      if (!approveSign.canProceed) return false;
      await repo.confirmApprove(milestone.id);
      return true;
    }, successMessage: 'Milestone approved: funds released to the freelancer');
  }

  Future<void> _requestChangesOnMilestone(Milestone milestone) async {
    final note = await showTextInputSheet(
      context,
      title: 'Request changes on the deliverable',
      fieldLabel: 'What needs to be fixed?',
      placeholder: 'Describe the expected changes…',
      submitLabel: 'Send feedback',
    );
    if (note == null || !mounted) return;
    final repo = AppScope.read(context).milestones;
    await _run(() async {
      await repo.requestChanges(milestone.id, note: note);
      return true;
    });
  }

  // ---------------------------------------------------------------------
  // Freelancer decision actions
  // ---------------------------------------------------------------------

  Future<void> _accept(Contract contract) async {
    final amount = formatUsdc(contract.totalAmount);
    final confirmed = await showConfirmSheet(
      context,
      title: 'Accept contract',
      body:
          'When you accept, the escrow is deployed on Stellar for '
          '$amount and the company will fund it to activate payments. '
          'Funds are released to your wallet as each milestone is '
          'approved.',
      confirmLabel: 'Accept and deploy escrow',
      dangerNote:
          'This starts an on-chain escrow; the action cannot be '
          'undone.',
    );
    if (confirmed != true || !mounted) return;
    final repo = AppScope.read(context).contracts;
    await _run(() async {
      await repo.accept(widget.contractId);
      return true;
    });
  }

  Future<void> _decide({required bool reject}) async {
    final note = await showTextInputSheet(
      context,
      title: reject ? 'Reject contract' : 'Request changes',
      fieldLabel: 'Message for the company',
      placeholder: 'Explain the reason…',
      submitLabel: reject ? 'Reject' : 'Send request',
      danger: reject,
    );
    if (note == null || !mounted) return;
    final repo = AppScope.read(context).contracts;
    await _run(() async {
      if (reject) {
        await repo.reject(widget.contractId, note: note);
      } else {
        await repo.requestChanges(widget.contractId, note: note);
      }
      return true;
    });
  }

  Future<void> _uploadDeliverable(Milestone milestone) async {
    final submitted = await showDeliverableFormSheet(
      context,
      milestone: milestone,
    );
    if (submitted == true && mounted) await _load();
  }

  // ---------------------------------------------------------------------
  // Disputes (either party)
  // ---------------------------------------------------------------------

  Future<void> _openDispute(Milestone milestone) async {
    final reason = await showTextInputSheet(
      context,
      title: 'Open dispute · ${milestone.title ?? 'Milestone'}',
      intro:
          'The milestone is paused and the funds stay locked in the '
          'escrow until there is a mutual resolution or an administrator '
          'steps in.',
      fieldLabel: 'Reason (minimum 10 characters)',
      placeholder: 'Describe the problem…',
      submitLabel: 'Open dispute',
      danger: true,
      minLength: 10,
    );
    if (reason == null || !mounted) return;
    final repo = AppScope.read(context).disputes;
    setState(() => _busy = true);
    try {
      final xdr = await repo.prepare(milestoneId: milestone.id, reason: reason);
      if (!mounted) return;
      final sign = await resolveSignature(context, xdr);
      if (!sign.canProceed) return;
      final dispute = await repo.open(
        milestoneId: milestone.id,
        reason: reason,
      );
      if (mounted) context.go('/disputes/${dispute.id}');
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _edit() async {
    await context.push('/contracts/${widget.contractId}/edit');
    if (mounted) await _load();
  }

  // ---------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final contract = _contract;
    return Scaffold(
      appBar: AppBar(title: Text(contract?.title ?? 'Contract')),
      body: switch ((contract, _error)) {
        (null, null) => const LoadingState(label: 'Loading contract…'),
        (null, final String error) => ErrorState(
          message: error,
          onRetry: _load,
        ),
        (final Contract c, _) => _buildDetail(c),
      },
    );
  }

  Widget _buildDetail(Contract contract) {
    final colors = AppColors.of(context);
    final user = AppScope.of(context).auth.user;
    final isCompany =
        contract.company?.userId != null &&
        contract.company?.userId == user?.id;
    final isFreelancer =
        contract.freelancer?.userId != null &&
        contract.freelancer?.userId == user?.id;
    final editable = contract.isEditable;
    final escrow = contract.escrow;
    final freelancerName =
        contract.freelancerName ?? contract.invitedEmail ?? emptyPlaceholder;

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          // Header: parties, amount and status.
          ContractSummaryHeader(
            contract: contract,
            freelancerName: freelancerName,
          ),
          const SizedBox(height: 16),

          ContractPartiesCard(
            contract: contract,
            freelancerName: freelancerName,
          ),

          if (contract.description != null &&
              contract.description!.isNotEmpty) ...[
            const SizedBox(height: 16),
            AppCard(
              title: 'Description',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    contract.description!,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.5,
                      color: colors.text,
                    ),
                  ),
                  if (contract.deadline != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      'Due date: ${formatDate(contract.deadline)}',
                      style: TextStyle(fontSize: 13, color: colors.textMuted),
                    ),
                  ],
                ],
              ),
            ),
          ],

          if (contract.reviewNote != null &&
              contract.reviewNote!.isNotEmpty &&
              (contract.status == 'changes_requested' ||
                  contract.status == 'rejected')) ...[
            const SizedBox(height: 16),
            AppCard(
              title: 'Note from the freelancer',
              child: Text(
                contract.reviewNote!,
                style: TextStyle(fontSize: 14, height: 1.5, color: colors.text),
              ),
            ),
          ],

          // Company lifecycle actions.
          if (isCompany && editable) ...[
            const SizedBox(height: 16),
            AppCard(
              title: 'Actions',
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  OutlinedButton(
                    onPressed: _busy ? null : _edit,
                    child: const Text('Edit'),
                  ),
                  FilledButton(
                    onPressed: _busy ? null : _send,
                    child: const Text('Send to freelancer'),
                  ),
                ],
              ),
            ),
          ],

          // Freelancer decision.
          if (isFreelancer && contract.isPendingAcceptance) ...[
            const SizedBox(height: 16),
            AppCard(
              title: 'You have a contract proposal',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'When you accept, the platform deploys and funds the '
                    'escrow on Stellar; payments are released to your '
                    'wallet as each milestone is approved.',
                    style: TextStyle(fontSize: 13.5, color: colors.textMuted),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      FilledButton(
                        onPressed: _busy ? null : () => _accept(contract),
                        child: const Text('Accept contract'),
                      ),
                      OutlinedButton(
                        onPressed: _busy ? null : () => _decide(reject: false),
                        child: const Text('Request changes'),
                      ),
                      FilledButton(
                        onPressed: _busy ? null : () => _decide(reject: true),
                        style: FilledButton.styleFrom(
                          backgroundColor: colors.danger,
                          foregroundColor: Colors.white,
                        ),
                        child: const Text('Reject'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],

          // Escrow summary.
          if (escrow != null) ...[
            const SizedBox(height: 16),
            EscrowPanel(escrow: escrow),
          ],

          // Company funds the escrow (non-custodial).
          if (isCompany && escrow != null && escrow.isCreated) ...[
            const SizedBox(height: 16),
            AppCard(
              title: 'Fund escrow',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'To activate payments, fund the escrow with '
                    '${formatUsdc(contract.totalAmount)} from your wallet. '
                    'You sign it with your own wallet; BolPay never '
                    'touches your funds.',
                    style: TextStyle(fontSize: 13.5, color: colors.textMuted),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _busy ? null : () => _fund(contract),
                    child: const Text('Fund escrow'),
                  ),
                ],
              ),
            ),
          ],

          // Milestones.
          const SizedBox(height: 16),
          MilestonesSection(
            milestones: contract.milestones,
            isCompany: isCompany,
            isFreelancer: isFreelancer,
            contractActive: contract.isActive,
            escrowFunded: escrow?.isFunded ?? false,
            busy: _busy,
            onUploadDeliverable: _uploadDeliverable,
            onApprove: _approve,
            onRequestChanges: _requestChangesOnMilestone,
            onOpenDispute: _openDispute,
            onViewDispute: (disputeId) => context.go('/disputes/$disputeId'),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
