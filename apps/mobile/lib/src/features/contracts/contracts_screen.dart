import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/app_scope.dart';
import '../../core/formatters.dart';
import '../../domain/models/contract.dart';
import '../../ui/widgets/feedback.dart';
import '../../ui/widgets/status_badge.dart';

/// Lista de contratos del freelancer / empleado fijo.
class ContractsScreen extends StatefulWidget {
  const ContractsScreen({super.key});

  @override
  State<ContractsScreen> createState() => _ContractsScreenState();
}

class _ContractsScreenState extends State<ContractsScreen> {
  List<Contract>? _contracts;
  String? _error;

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
      final contracts = await AppScope.read(context).contracts.list();
      if (mounted) setState(() => _contracts = contracts);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Ocurrió un error inesperado.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mis contratos')),
      body: switch ((_contracts, _error)) {
        (null, null) => const Center(child: CircularProgressIndicator()),
        (null, final String error) => ErrorState(
          message: error,
          onRetry: _load,
        ),
        (final List<Contract> contracts, _) when contracts.isEmpty =>
          RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: const [
                SizedBox(height: 160),
                EmptyState(
                  icon: Icons.description_outlined,
                  message: 'Aún no tienes contratos asignados.',
                ),
              ],
            ),
          ),
        (final List<Contract> contracts, _) => RefreshIndicator(
          onRefresh: _load,
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            physics: const AlwaysScrollableScrollPhysics(),
            itemCount: contracts.length,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (context, index) =>
                _ContractCard(contract: contracts[index]),
          ),
        ),
      },
    );
  }
}

class _ContractCard extends StatelessWidget {
  const _ContractCard({required this.contract});

  final Contract contract;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final milestones = contract.milestones;
    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.go('/contracts/${contract.id}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      contract.title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  StatusBadge.contract(contract.status),
                ],
              ),
              const SizedBox(height: 8),
              if (contract.companyName != null)
                Row(
                  children: [
                    Icon(
                      Icons.business_outlined,
                      size: 16,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      contract.companyName!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    formatUsdc(contract.totalAmount),
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (milestones.isNotEmpty)
                    Text(
                      '${contract.releasedMilestones}/${milestones.length} '
                      'milestones pagados',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
