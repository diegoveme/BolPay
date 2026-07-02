import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/app_scope.dart';
import '../../core/formatters.dart';
import '../../domain/models/payroll.dart';
import '../../ui/theme.dart';
import '../../ui/widgets/empty_state.dart';
import '../../ui/widgets/error_state.dart';
import '../../ui/widgets/loading_state.dart';
import '../../ui/widgets/section_header.dart';
import '../../ui/widgets/status_badge.dart';
import '../../ui/widgets/tappable_list_card.dart';

/// Payroll list (company; the router keeps other roles out).
///
/// Shows each payroll's frequency, recipient count, per-cycle total,
/// next run and status, with a "+ New payroll" action (web parity).
class PayrollsScreen extends StatefulWidget {
  const PayrollsScreen({super.key});

  @override
  State<PayrollsScreen> createState() => _PayrollsScreenState();
}

class _PayrollsScreenState extends State<PayrollsScreen> {
  List<Payroll>? _payrolls;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _payrolls = null;
      _error = null;
    });
    try {
      final payrolls = await AppScope.read(context).payrolls.list();
      if (mounted) setState(() => _payrolls = payrolls);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'An unexpected error occurred.');
    }
  }

  Future<void> _openNew() async {
    await context.push('/payrolls/new');
    if (mounted) await _load();
  }

  Future<void> _openDetail(Payroll payroll) async {
    await context.push('/payrolls/${payroll.id}');
    if (mounted) await _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Payroll')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            SectionHeader(
              title: 'On-chain payroll',
              subtitle: 'Recurring payrolls with automatic USDC distribution',
              trailing: FilledButton(
                onPressed: _openNew,
                child: const Text('+ New payroll'),
              ),
            ),
            const SizedBox(height: 16),
            ..._buildContent(),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildContent() {
    if (_error != null) {
      return [ErrorState(message: _error!, onRetry: _load)];
    }
    final payrolls = _payrolls;
    if (payrolls == null) {
      return const [
        Padding(
          padding: EdgeInsets.only(top: 120),
          child: LoadingState(label: 'Loading payrolls…'),
        ),
      ];
    }
    if (payrolls.isEmpty) {
      return const [
        SizedBox(height: 80),
        EmptyState(
          icon: Icons.payments_outlined,
          title: 'No payrolls',
          hint:
              'Create a payroll, add recipients and fund it to schedule '
              'the distribution.',
        ),
      ];
    }
    return [
      for (var i = 0; i < payrolls.length; i++) ...[
        if (i > 0) const SizedBox(height: 12),
        _PayrollCard(
          payroll: payrolls[i],
          onTap: () => _openDetail(payrolls[i]),
        ),
      ],
    ];
  }
}

class _PayrollCard extends StatelessWidget {
  const _PayrollCard({required this.payroll, required this.onTap});

  final Payroll payroll;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return TappableListCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  payroll.name,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: colors.text,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              StatusBadge.payroll(payroll.status),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            '${payroll.frequencyLabel} · '
            '${payroll.items.length} recipients',
            style: TextStyle(fontSize: 13, color: colors.textMuted),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                formatUsdc(payroll.totalPerCycle),
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: colors.primary,
                ),
              ),
              Text(
                'Next run ${formatDateTime(payroll.nextRun)}',
                style: TextStyle(fontSize: 12.5, color: colors.textMuted),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
