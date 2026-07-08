import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/app_scope.dart';
import '../../domain/models/models.dart';
import '../../ui/theme.dart';
import '../../ui/widgets/error_state.dart';
import '../../ui/widgets/section_header.dart';
import 'widgets/dashboard_metrics.dart';
import 'widgets/dashboard_stat_grid.dart';
import 'widgets/quick_links_section.dart';
import 'widgets/recent_activity_section.dart';
import 'widgets/recent_contracts_section.dart';

/// Dashboard (web `DashboardPage` parity): greeting, contract summary
/// stats, role-specific metric charts, recent contracts, quick links and
/// the recent activity feed.
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  List<Contract>? _contracts;
  List<ActivityLog>? _activity;
  SummaryMetrics? _summary;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (!mounted) return;
    final scope = AppScope.read(context);
    final role = scope.auth.user?.role;
    final managesContracts = role != 'fixed_employee';
    // Administrators use a platform panel on the web; the mobile dashboard
    // does not render role charts for them.
    final showsMetrics = role != null && role != 'administrator';
    setState(() => _error = null);
    // Role metrics are optional: a failure here must not blank the whole
    // dashboard, so it is fetched independently of contracts and activity.
    if (showsMetrics) {
      unawaited(_loadSummary(scope));
    }
    try {
      final contracts = managesContracts
          ? await scope.contracts.list()
          : <Contract>[];
      final activity = await scope.activity.mine();
      if (mounted) {
        setState(() {
          _contracts = contracts;
          _activity = activity;
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'An unexpected error occurred.');
    }
  }

  Future<void> _loadSummary(AppScope scope) async {
    try {
      final summary = await scope.metrics.summary();
      if (mounted) setState(() => _summary = summary);
    } catch (_) {
      // Charts are supplementary; keep the dashboard usable without them.
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = AppScope.of(context).auth;
    return ListenableBuilder(
      listenable: auth,
      builder: (context, _) {
        final user = auth.user;
        final role = user?.role;
        final managesContracts = role != 'fixed_employee';

        final contracts = _contracts ?? const <Contract>[];
        final active = contracts.where((c) => c.status == 'active').toList();
        final pending = contracts
            .where((c) => c.status == 'pending_acceptance')
            .length;
        final completed = contracts
            .where((c) => c.status == 'completed')
            .length;
        final lockedAmount = active.fold<double>(
          0,
          (sum, c) => sum + (double.tryParse(c.totalAmount) ?? 0),
        );

        final showError =
            _error != null && _contracts == null && _activity == null;

        return Scaffold(
          appBar: AppBar(title: const Text('Dashboard')),
          body: showError
              ? ErrorState(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    children: [
                      SectionHeader(
                        title: 'Hi, ${user?.name ?? user?.email ?? ''}',
                        subtitle:
                            '${statusLabel(StatusKind.role, role ?? '')} '
                            'dashboard · USDC payments on Stellar',
                      ),
                      const SizedBox(height: 16),
                      if (managesContracts) ...[
                        DashboardStatGrid(
                          activeCount: active.length,
                          pendingCount: pending,
                          completedCount: completed,
                          lockedAmount: lockedAmount,
                        ),
                        const SizedBox(height: 20),
                      ],
                      if (_summary != null) ...[
                        DashboardMetrics(metrics: _summary!),
                        const SizedBox(height: 20),
                      ],
                      if (managesContracts) ...[
                        RecentContractsSection(
                          contracts: _contracts,
                          role: role,
                        ),
                        const SizedBox(height: 20),
                      ],
                      QuickLinksSection(
                        role: role,
                        onOpen: (route) => context.go(route),
                      ),
                      RecentActivitySection(activity: _activity),
                    ],
                  ),
                ),
        );
      },
    );
  }
}
