import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../../../domain/models/escrow.dart';
import '../../../ui/theme.dart';
import '../../../ui/widgets/status_badge.dart';
import 'admin_empty_list.dart';

/// Escrows tab table: one row per escrow, or an empty placeholder.
class AdminEscrowsTable extends StatelessWidget {
  const AdminEscrowsTable({super.key, required this.escrows});

  final List<Escrow> escrows;

  @override
  Widget build(BuildContext context) {
    if (escrows.isEmpty) return const AdminEmptyList(title: 'No escrows');
    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      itemCount: escrows.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, index) => _EscrowRow(escrow: escrows[index]),
    );
  }
}

/// Escrows tab row: source, type, on-chain contract and balances.
class _EscrowRow extends StatelessWidget {
  const _EscrowRow({required this.escrow});

  final Escrow escrow;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final soroban = escrow.trustlessWorkId;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  escrow.sourceLabel ?? emptyPlaceholder,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: colors.text,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              StatusBadge.escrow(escrow.status),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '${escrow.type ?? emptyPlaceholder} · '
            '${soroban == null || soroban.isEmpty ? emptyPlaceholder : shortAddress(soroban)}',
            style: TextStyle(
              fontSize: 12,
              fontFamily: 'monospace',
              color: colors.textMuted,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Funded ${formatUsdc(escrow.fundedAmount)} · '
            'Released ${formatUsdc(escrow.releasedAmount ?? '0')}',
            style: TextStyle(fontSize: 13, color: colors.textMuted),
          ),
        ],
      ),
    );
  }
}
