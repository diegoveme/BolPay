import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../../../ui/theme.dart';

/// Chip confirming the connected custodial wallet, with a reset action.
class ConnectedWalletChip extends StatelessWidget {
  const ConnectedWalletChip({
    super.key,
    required this.address,
    required this.onReset,
  });

  final String address;
  final Future<void> Function()? onReset;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: colors.successBg,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        border: Border.all(color: colors.success.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          Icon(Icons.check_circle_outline, size: 18, color: colors.success),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Wallet connected · ${shortAddress(address)}',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: colors.success,
              ),
            ),
          ),
          TextButton(
            onPressed: onReset,
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: const Text('Use a different wallet'),
          ),
        ],
      ),
    );
  }
}
