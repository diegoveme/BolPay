import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../../../domain/models/escrow.dart';
import '../../../ui/widgets/app_card.dart';
import '../../../ui/widgets/detail_row.dart';
import '../../../ui/widgets/status_badge.dart';

/// Escrow summary card of the contract detail: mode, Soroban contract id,
/// funded and released amounts, with the escrow status badge.
class EscrowPanel extends StatelessWidget {
  const EscrowPanel({super.key, required this.escrow});

  final Escrow escrow;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      title: 'Escrow (Trustless Work · Stellar testnet)',
      actions: [StatusBadge.escrow(escrow.status)],
      child: Column(
        children: [
          if (escrow.mode != null)
            DetailRow(
              label: 'Mode',
              value: escrow.mode == 'trustless_work'
                  ? 'Trustless Work'
                  : 'Simulated',
            ),
          DetailRow(
            label: 'Soroban contract',
            value: escrow.trustlessWorkId == null
                ? emptyPlaceholder
                : shortAddress(escrow.trustlessWorkId!),
            mono: true,
          ),
          DetailRow(
            label: 'Funded',
            value: formatUsdc(escrow.fundedAmount),
            mono: true,
          ),
          DetailRow(
            label: 'Released',
            value: formatUsdc(escrow.releasedAmount ?? '0'),
            mono: true,
          ),
        ],
      ),
    );
  }
}
