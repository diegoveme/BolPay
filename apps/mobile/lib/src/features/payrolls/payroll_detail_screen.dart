import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/app_scope.dart';
import '../../core/formatters.dart';
import '../../core/wallet_signing.dart';
import '../../domain/models/payroll.dart';
import '../../ui/widgets/confirm_sheet.dart';
import '../../ui/widgets/error_state.dart';
import '../../ui/widgets/feedback.dart';
import '../../ui/widgets/loading_state.dart';
import '../../ui/widgets/section_header.dart';
import '../../ui/widgets/status_badge.dart';
import 'widgets/fund_cycle_sheet.dart';
import 'widgets/payroll_cycle_card.dart';
import 'widgets/payroll_executions_card.dart';
import 'widgets/payroll_recipients_card.dart';

/// Payroll detail: cycle info, recipients and execution history, with
/// actions to edit, fund, run, pause/resume and archive (web parity).
class PayrollDetailScreen extends StatefulWidget {
  const PayrollDetailScreen({super.key, required this.payrollId});

  final String payrollId;

  @override
  State<PayrollDetailScreen> createState() => _PayrollDetailScreenState();
}

class _PayrollDetailScreenState extends State<PayrollDetailScreen> {
  Payroll? _payroll;
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _payroll = null;
      _error = null;
    });
    try {
      final payroll = await AppScope.read(
        context,
      ).payrolls.byId(widget.payrollId);
      if (mounted) setState(() => _payroll = payroll);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'An unexpected error occurred.');
    }
  }

  /// Runs a mutation with the busy flag, error snackbar and reload.
  Future<void> _runAction(
    Future<void> Function() action, {
    String? successMessage,
  }) async {
    setState(() => _busy = true);
    try {
      await action();
      if (mounted && successMessage != null) {
        showSuccessSnackBar(context, successMessage);
      }
      await _load();
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _edit(Payroll payroll) async {
    final changed = await context.push<bool>('/payrolls/${payroll.id}/edit');
    if (changed == true && mounted) await _load();
  }

  Future<void> _fund(Payroll payroll) async {
    final totalLabel = formatUsdc(payroll.totalPerCycle);
    final request = await showFundCycleSheet(context, totalLabel: totalLabel);
    if (request == null || !mounted) return;
    final confirmed = await showConfirmSheet(
      context,
      title: 'Fund payroll cycle',
      body:
          'An escrow for $totalLabel is deployed and funded on Stellar. '
          'The distribution runs automatically on the scheduled date.',
      confirmLabel: 'Fund $totalLabel',
    );
    if (confirmed != true || !mounted) return;
    setState(() => _busy = true);
    try {
      final repo = AppScope.read(context).payrolls;
      final xdr = await repo.prepareFund(payroll.id);
      if (!mounted) return;
      // Simulated mode continues unsigned; a custodial session signs and
      // broadcasts the funding XDR and its hash goes to the confirm call.
      final sign = await resolveSignature(context, xdr);
      if (!sign.canProceed) return;
      await repo.confirmFund(
        payroll.id,
        txHash: sign.txHash,
        firstRun: request.firstRun?.toUtc().toIso8601String(),
      );
      if (mounted) showSuccessSnackBar(context, 'Payroll escrow funded');
      await _load();
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _execute(Payroll payroll) async {
    final totalLabel = formatUsdc(payroll.totalPerCycle);
    final confirmed = await showConfirmSheet(
      context,
      title: 'Run payroll now',
      body:
          '$totalLabel will be distributed to ${payroll.items.length} '
          'recipients from the escrow.',
      confirmLabel: 'Distribute $totalLabel',
      danger: true,
      dangerNote: 'The distribution is on-chain and irreversible.',
    );
    if (confirmed != true || !mounted) return;
    final repo = AppScope.read(context).payrolls;
    await _runAction(
      () => repo.execute(payroll.id),
      successMessage: 'Payroll cycle executed.',
    );
  }

  Future<void> _archive(Payroll payroll) async {
    final confirmed = await showConfirmSheet(
      context,
      title: 'Archive payroll',
      body:
          'The payroll ${payroll.name} will be archived and will stop '
          'running. If it holds funds in escrow, they will be returned to '
          'the company.',
      confirmLabel: 'Archive payroll',
      danger: true,
    );
    if (confirmed != true || !mounted) return;
    final repo = AppScope.read(context).payrolls;
    await _runAction(
      () => repo.archive(payroll.id),
      successMessage: 'Payroll archived.',
    );
  }

  Future<void> _pause(Payroll payroll) async {
    final repo = AppScope.read(context).payrolls;
    await _runAction(
      () => repo.pause(payroll.id),
      successMessage: 'Payroll paused.',
    );
  }

  Future<void> _resume(Payroll payroll) async {
    final repo = AppScope.read(context).payrolls;
    await _runAction(
      () => repo.resume(payroll.id),
      successMessage: 'Payroll resumed.',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Payroll')),
      body: switch ((_payroll, _error)) {
        (null, null) => const LoadingState(label: 'Loading payroll…'),
        (null, final String error) => ErrorState(
          message: error,
          onRetry: _load,
        ),
        (final Payroll payroll, _) => RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            children: [
              SectionHeader(
                title: payroll.name,
                subtitle:
                    '${payroll.items.length} recipients · '
                    '${formatUsdc(payroll.totalPerCycle)} per cycle',
                trailing: StatusBadge.payroll(payroll.status),
              ),
              const SizedBox(height: 16),
              PayrollCycleCard(
                payroll: payroll,
                actions: _buildActions(payroll),
              ),
              const SizedBox(height: 16),
              PayrollRecipientsCard(items: payroll.items),
              const SizedBox(height: 16),
              PayrollExecutionsCard(executions: payroll.executions),
            ],
          ),
        ),
      },
    );
  }

  List<Widget> _buildActions(Payroll payroll) {
    final disabled = _busy;
    return [
      if (payroll.canEdit) ...[
        OutlinedButton(
          onPressed: disabled ? null : () => _edit(payroll),
          child: const Text('Edit'),
        ),
        FilledButton(
          onPressed: disabled ? null : () => _fund(payroll),
          child: const Text('Fund cycle'),
        ),
      ],
      if (payroll.status == 'funded')
        FilledButton(
          onPressed: disabled ? null : () => _execute(payroll),
          child: const Text('Run now'),
        ),
      if (payroll.status == 'funded' || payroll.status == 'active')
        OutlinedButton(
          onPressed: disabled ? null : () => _pause(payroll),
          child: const Text('Pause'),
        ),
      if (payroll.status == 'paused')
        FilledButton(
          onPressed: disabled ? null : () => _resume(payroll),
          child: const Text('Resume'),
        ),
      if (payroll.status != 'funded' && payroll.status != 'completed')
        TextButton(
          onPressed: disabled ? null : () => _archive(payroll),
          child: const Text('Archive'),
        ),
    ];
  }
}
