import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../../../domain/models/payroll.dart';
import '../../../ui/widgets/app_card.dart';
import '../../../ui/widgets/detail_row.dart';

/// Cycle summary card for a payroll: next run, cycle escrow id and funded
/// amount, plus the lifecycle action buttons supplied by the screen.
class PayrollCycleCard extends StatelessWidget {
  const PayrollCycleCard({
    super.key,
    required this.payroll,
    this.actions = const [],
  });

  final Payroll payroll;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final escrow = payroll.escrow;
    return AppCard(
      title: 'Cycle',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DetailRow(label: 'Next run', value: formatDateTime(payroll.nextRun)),
          if (escrow != null) ...[
            DetailRow(
              label: 'Cycle escrow',
              value: escrow.trustlessWorkId == null
                  ? emptyPlaceholder
                  : shortAddress(escrow.trustlessWorkId!),
              mono: true,
            ),
            DetailRow(label: 'Funded', value: formatUsdc(escrow.fundedAmount)),
          ],
          if (actions.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Divider(),
            const SizedBox(height: 12),
            Wrap(spacing: 8, runSpacing: 8, children: actions),
          ],
        ],
      ),
    );
  }
}
