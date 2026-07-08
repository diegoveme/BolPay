import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import 'stat_card.dart';

/// Two-by-two grid of contract summary stats: active and pending on the
/// first row, completed and USDC-in-escrow on the second.
class DashboardStatGrid extends StatelessWidget {
  const DashboardStatGrid({
    super.key,
    required this.activeCount,
    required this.pendingCount,
    required this.completedCount,
    required this.lockedAmount,
  });

  final int activeCount;
  final int pendingCount;
  final int completedCount;
  final double lockedAmount;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: StatCard(label: 'Active contracts', value: '$activeCount'),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: StatCard(
                label: 'Pending acceptance',
                value: '$pendingCount',
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: StatCard(label: 'Completed', value: '$completedCount'),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: StatCard(
                label: 'USDC in escrow (active)',
                value: formatUsdc(lockedAmount.toStringAsFixed(2)),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
