import 'package:flutter/material.dart';

import '../../../core/api_config.dart';
import '../../../core/formatters.dart';
import '../../../domain/models/payroll.dart';
import '../../../ui/theme.dart';
import '../../../ui/widgets/app_card.dart';
import '../../../ui/widgets/feedback.dart';
import '../../../ui/widgets/status_badge.dart';

/// Execution history for a payroll: an empty-state note or one tile per
/// past cycle run with its status and per-recipient transactions.
class PayrollExecutionsCard extends StatelessWidget {
  const PayrollExecutionsCard({super.key, required this.executions});

  final List<PayrollExecution> executions;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return AppCard(
      title: 'Execution history (${executions.length})',
      child: executions.isEmpty
          ? Text(
              'No cycle has run yet.',
              style: TextStyle(fontSize: 13, color: colors.textMuted),
            )
          : Column(
              children: [
                for (var i = 0; i < executions.length; i++) ...[
                  if (i > 0) const SizedBox(height: 10),
                  _ExecutionTile(execution: executions[i]),
                ],
              ],
            ),
    );
  }
}

class _ExecutionTile extends StatelessWidget {
  const _ExecutionTile({required this.execution});

  final PayrollExecution execution;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        border: Border.all(color: colors.border),
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
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
                      formatDateTime(execution.executedAt),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: colors.text,
                      ),
                    ),
                    Text(
                      '${formatUsdc(execution.totalAmount)} distributed',
                      style: TextStyle(fontSize: 13, color: colors.textMuted),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              StatusBadge(
                status: execution.status,
                kind: StatusKind.payrollExecution,
              ),
            ],
          ),
          if (execution.transactions.isNotEmpty) ...[
            const SizedBox(height: 8),
            for (final tx in execution.transactions)
              _TransactionLine(transaction: tx),
          ],
        ],
      ),
    );
  }
}

/// One transfer inside an execution. A real hash copies its stellar.expert
/// link (the app has no in-app browser, same as the milestone payment line);
/// a simulated one renders as plain text.
class _TransactionLine extends StatelessWidget {
  const _TransactionLine({required this.transaction});

  final PayrollTransaction transaction;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final hash = transaction.txHash;
    final explorerUrl = ApiConfig.explorerTxUrl(hash);
    final label =
        '${formatUsdc(transaction.amount)} → '
        '${hash == null ? emptyPlaceholder : shortAddress(hash)}'
        '${transaction.isSimulated ? ' (simulated)' : ''}';
    final style = TextStyle(
      fontSize: 12.5,
      color: explorerUrl == null ? colors.textMuted : colors.primary,
    );

    if (explorerUrl == null) {
      return Padding(
        padding: const EdgeInsets.only(top: 2),
        child: Text(label, style: style),
      );
    }
    return InkWell(
      onTap: () => copyToClipboard(
        context,
        explorerUrl,
        message: 'Explorer link copied to clipboard',
      ),
      child: Padding(
        padding: const EdgeInsets.only(top: 2),
        child: Text(label, style: style),
      ),
    );
  }
}
