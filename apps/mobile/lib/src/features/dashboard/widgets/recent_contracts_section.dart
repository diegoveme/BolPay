import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/formatters.dart';
import '../../../domain/models/contract.dart';
import '../../../ui/theme.dart';
import '../../../ui/widgets/app_card.dart';
import '../../../ui/widgets/empty_state.dart';
import '../../../ui/widgets/loading_state.dart';

/// "Recent contracts" card: shows a loading state while [contracts] is
/// null, an empty state when there are none, or up to five contract rows.
class RecentContractsSection extends StatelessWidget {
  const RecentContractsSection({
    super.key,
    required this.contracts,
    required this.role,
  });

  final List<Contract>? contracts;
  final String? role;

  @override
  Widget build(BuildContext context) {
    final items = contracts ?? const <Contract>[];
    return AppCard(
      title: 'Recent contracts',
      child: contracts == null
          ? const LoadingState()
          : items.isEmpty
          ? EmptyState(
              title: 'No contracts yet',
              hint: role == 'company'
                  ? 'Create your first contract from '
                        'the Contracts section.'
                  : 'When a company sends you a '
                        'contract it will show up here.',
            )
          : Column(
              children: [
                for (final contract in items.take(5))
                  _ContractRow(contract: contract, viewerRole: role),
              ],
            ),
    );
  }
}

/// One row of the "Recent contracts" card: title, counterparty, amount.
class _ContractRow extends StatelessWidget {
  const _ContractRow({required this.contract, required this.viewerRole});

  final Contract contract;
  final String? viewerRole;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final counterparty = viewerRole == 'freelancer'
        ? contract.companyName
        : contract.freelancerName;
    return InkWell(
      onTap: () => context.go('/contracts/${contract.id}'),
      borderRadius: BorderRadius.circular(AppTheme.radiusControl),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    contract.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: colors.primary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    counterparty ?? emptyPlaceholder,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 13, color: colors.textMuted),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Text(
              formatUsdc(contract.totalAmount),
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: colors.text,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
