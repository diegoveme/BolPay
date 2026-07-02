import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../../../domain/models/contract.dart';
import '../../../ui/theme.dart';
import '../../../ui/widgets/status_badge.dart';

/// Contract detail header: the parties and amount summary line plus the
/// contract status badge.
class ContractSummaryHeader extends StatelessWidget {
  const ContractSummaryHeader({
    super.key,
    required this.contract,
    required this.freelancerName,
  });

  final Contract contract;
  final String freelancerName;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Text(
            '${contract.companyName ?? emptyPlaceholder} ↔ '
            '$freelancerName · '
            '${formatUsdc(contract.totalAmount)}',
            style: TextStyle(fontSize: 14, color: colors.textMuted),
          ),
        ),
        const SizedBox(width: 8),
        StatusBadge.contract(contract.status),
      ],
    );
  }
}
