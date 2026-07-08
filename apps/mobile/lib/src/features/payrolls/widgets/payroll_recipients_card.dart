import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../../../domain/models/payroll.dart';
import '../../../ui/theme.dart';
import '../../../ui/widgets/app_card.dart';
import '../../../ui/widgets/avatar_circle.dart';

/// Recipients list for a payroll cycle: one row per item with the
/// employee label, wallet address and per-cycle amount.
class PayrollRecipientsCard extends StatelessWidget {
  const PayrollRecipientsCard({super.key, required this.items});

  final List<PayrollItem> items;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      title: 'Recipients',
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++) ...[
            if (i > 0) const Divider(height: 20),
            _RecipientRow(item: items[i]),
          ],
        ],
      ),
    );
  }
}

class _RecipientRow extends StatelessWidget {
  const _RecipientRow({required this.item});

  final PayrollItem item;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final address = item.recipientAddress;
    return Row(
      children: [
        AvatarCircle(name: item.displayLabel, size: 32),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                item.displayLabel,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: colors.text,
                ),
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                address == null || address.isEmpty
                    ? emptyPlaceholder
                    : shortAddress(address),
                style: TextStyle(
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: colors.textMuted,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Text(
          formatUsdc(item.amount),
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: colors.text,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
      ],
    );
  }
}
