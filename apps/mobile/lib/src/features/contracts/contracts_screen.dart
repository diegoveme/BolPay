import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/app_scope.dart';
import '../../core/formatters.dart';
import '../../domain/models/contract.dart';
import '../../ui/theme.dart';
import '../../ui/widgets/avatar_circle.dart';
import '../../ui/widgets/empty_state.dart';
import '../../ui/widgets/error_state.dart';
import '../../ui/widgets/loading_state.dart';
import '../../ui/widgets/status_badge.dart';
import '../../ui/widgets/tappable_list_card.dart';

/// Contract statuses offered by the filter chips, in web enum order.
const List<String> _statusFilters = [
  'draft',
  'pending_acceptance',
  'changes_requested',
  'accepted',
  'active',
  'completed',
  'rejected',
];

/// Contract list for the current user (web `/contracts` parity): status
/// filter chips, per-role counterpart column and the company-only
/// "New contract" action.
class ContractsScreen extends StatefulWidget {
  const ContractsScreen({super.key});

  @override
  State<ContractsScreen> createState() => _ContractsScreenState();
}

class _ContractsScreenState extends State<ContractsScreen> {
  List<Contract>? _contracts;
  String? _error;
  String? _statusFilter;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _contracts = null;
      _error = null;
    });
    try {
      final contracts = await AppScope.read(
        context,
      ).contracts.list(status: _statusFilter);
      if (mounted) setState(() => _contracts = contracts);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'An unexpected error occurred.');
    }
  }

  void _setFilter(String? status) {
    if (_statusFilter == status) return;
    setState(() => _statusFilter = status);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final user = AppScope.of(context).auth.user;
    final isCompany = user?.role == 'company';
    return Scaffold(
      appBar: AppBar(title: const Text('Contracts')),
      floatingActionButton: isCompany
          ? FloatingActionButton.extended(
              onPressed: () async {
                await context.push('/contracts/new');
                if (mounted) _load();
              },
              icon: const Icon(Icons.add),
              label: const Text('New contract'),
            )
          : null,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Text(
              'Milestone-based agreements backed by escrow on Stellar',
              style: TextStyle(fontSize: 14, color: colors.textMuted),
            ),
          ),
          SizedBox(
            height: 52,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              children: [
                _FilterChip(
                  label: 'All',
                  selected: _statusFilter == null,
                  onSelected: () => _setFilter(null),
                ),
                for (final status in _statusFilters)
                  _FilterChip(
                    label: statusLabel(StatusKind.contract, status),
                    selected: _statusFilter == status,
                    onSelected: () => _setFilter(status),
                  ),
              ],
            ),
          ),
          Expanded(child: _buildBody(user?.role)),
        ],
      ),
    );
  }

  Widget _buildBody(String? viewerRole) {
    return switch ((_contracts, _error)) {
      (null, null) => const LoadingState(label: 'Loading contracts…'),
      (null, final String error) => ErrorState(message: error, onRetry: _load),
      (final List<Contract> contracts, _) when contracts.isEmpty =>
        RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            children: [
              const SizedBox(height: 120),
              EmptyState(
                title: 'No contracts',
                hint: viewerRole == 'company'
                    ? 'Create your first one with the '
                          '“New contract” button.'
                    : 'When you receive a proposal it will appear here.',
              ),
            ],
          ),
        ),
      (final List<Contract> contracts, _) => RefreshIndicator(
        onRefresh: _load,
        child: ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 6, 16, 88),
          physics: const AlwaysScrollableScrollPhysics(),
          itemCount: contracts.length,
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (context, index) => _ContractCard(
            contract: contracts[index],
            viewerRole: viewerRole,
            onReturn: _load,
          ),
        ),
      ),
    };
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  final String label;
  final bool selected;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        showCheckmark: false,
        onSelected: (_) => onSelected(),
        selectedColor: colors.primarySubtle,
        labelStyle: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: selected ? colors.primary : colors.textMuted,
        ),
        side: BorderSide(color: selected ? colors.primary : colors.border),
      ),
    );
  }
}

class _ContractCard extends StatelessWidget {
  const _ContractCard({
    required this.contract,
    required this.viewerRole,
    required this.onReturn,
  });

  final Contract contract;
  final String? viewerRole;
  final VoidCallback onReturn;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    // Freelancers see the company; everyone else sees the freelancer
    // (web column parity).
    final counterpartName = viewerRole == 'freelancer'
        ? (contract.companyName ?? emptyPlaceholder)
        : (contract.freelancerName ?? emptyPlaceholder);
    final counterpartAvatar = viewerRole == 'freelancer'
        ? contract.company?.avatarUrl
        : contract.freelancer?.avatarUrl;
    final milestones = contract.milestones;
    return TappableListCard(
      onTap: () async {
        await context.push('/contracts/${contract.id}');
        onReturn();
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  contract.title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: colors.text,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              StatusBadge.contract(contract.status),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              AvatarCircle(
                imageUrl: counterpartAvatar,
                name: counterpartName,
                size: 24,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  counterpartName,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 13, color: colors.textMuted),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                formatUsdc(contract.totalAmount),
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: colors.text,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
              if (milestones.isNotEmpty)
                Text(
                  '${contract.releasedMilestones}/${milestones.length} '
                  'paid',
                  style: TextStyle(fontSize: 13, color: colors.textMuted),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            contract.deadline == null
                ? 'Created ${formatDate(contract.createdAt)}'
                : 'Created ${formatDate(contract.createdAt)} · '
                      'due ${formatDate(contract.deadline)}',
            style: TextStyle(fontSize: 12.5, color: colors.textFaint),
          ),
        ],
      ),
    );
  }
}
