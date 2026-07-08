import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../../../ui/theme.dart';
import '../../../ui/widgets/app_card.dart';

/// Recipients editor card for the payroll form: the running total, an
/// add-recipient action, an empty-state hint and the list of recipient
/// editors supplied by the screen through [itemBuilder].
class PayrollRecipientsEditor extends StatelessWidget {
  const PayrollRecipientsEditor({
    super.key,
    required this.total,
    required this.showEmptyHint,
    required this.itemCount,
    required this.itemBuilder,
    required this.onAddRecipient,
  });

  final double total;
  final bool showEmptyHint;
  final int itemCount;
  final IndexedWidgetBuilder itemBuilder;
  final VoidCallback onAddRecipient;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return AppCard(
      title: 'Recipients · total ${formatUsdc(total.toStringAsFixed(2))}',
      actions: [
        OutlinedButton(
          onPressed: onAddRecipient,
          child: const Text('+ Add recipient'),
        ),
      ],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (showEmptyHint)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                "You don't have any fixed employees with a "
                'connected wallet yet. Invite them by email as '
                'a "fixed employee"; once they sign in and '
                'connect their wallet you can add them to the '
                'payroll.',
                style: TextStyle(fontSize: 13, color: colors.textMuted),
              ),
            ),
          for (var i = 0; i < itemCount; i++) ...[
            if (i > 0) const SizedBox(height: 12),
            itemBuilder(context, i),
          ],
        ],
      ),
    );
  }
}
