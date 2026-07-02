import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../../../ui/theme.dart';
import '../../../ui/widgets/app_card.dart';

/// Linked Stellar wallet card: shows the short address with a copy action,
/// or a "No wallet linked" placeholder when none is available.
class WalletCard extends StatelessWidget {
  const WalletCard({super.key, required this.address, required this.onCopy});

  /// Linked Stellar address (may be null or empty).
  final String? address;

  /// Copies the address to the clipboard.
  final VoidCallback onCopy;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return AppCard(
      title: 'Stellar wallet',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Address',
            style: TextStyle(fontSize: 13, color: colors.textMuted),
          ),
          const SizedBox(height: 4),
          if (address == null || address!.isEmpty)
            Text(
              'No wallet linked',
              style: TextStyle(fontSize: 14, color: colors.text),
            )
          else
            Row(
              children: [
                Expanded(
                  child: Text(
                    shortAddress(address!),
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      fontFamily: 'monospace',
                      color: colors.text,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: 'Copy address',
                  onPressed: onCopy,
                  icon: Icon(
                    Icons.copy_outlined,
                    size: 18,
                    color: colors.textMuted,
                  ),
                ),
              ],
            ),
          const SizedBox(height: 8),
          Text(
            'Your milestone and payroll payments arrive directly '
            'at this address on the Stellar network.',
            style: TextStyle(fontSize: 13, color: colors.textMuted),
          ),
        ],
      ),
    );
  }
}
