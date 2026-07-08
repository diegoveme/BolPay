import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../../../domain/models/metrics.dart';
import '../../../ui/charts/charts.dart';
import '../../../ui/theme.dart';
import '../../../ui/widgets/app_card.dart';
import 'stat_card.dart';

/// Role-specific metric charts under the dashboard stats, mirroring the web
/// `CompanyCharts` / `FreelancerCharts` / `FixedEmployeeView`. Administrators
/// use a platform panel on the web that the mobile app does not carry.
class DashboardMetrics extends StatelessWidget {
  const DashboardMetrics({super.key, required this.metrics});

  final SummaryMetrics metrics;

  @override
  Widget build(BuildContext context) {
    return switch (metrics) {
      final CompanyMetrics m => _CompanyCharts(metrics: m),
      final FreelancerMetrics m => _FreelancerCharts(metrics: m),
      final FixedEmployeeMetrics m => _FixedEmployeeView(metrics: m),
    };
  }
}

/// Vertical spacing between stacked chart cards.
const _gap = SizedBox(height: 16);

class _CompanyCharts extends StatelessWidget {
  const _CompanyCharts({required this.metrics});

  final CompanyMetrics metrics;

  @override
  Widget build(BuildContext context) {
    final palette = ChartPalette.of(context);
    return Column(
      children: [
        AppCard(
          title: 'Contracts by status',
          child: DonutChart(
            data: metrics.contractsByStatus,
            caption: 'contracts',
            label: (key) => statusLabel(StatusKind.contract, key),
          ),
        ),
        _gap,
        AppCard(
          title: 'Funded vs released (USDC)',
          child: TrendChart(
            data: metrics.fundingTrend,
            series: [
              TrendSeries(
                label: 'Funded',
                color: palette.at(0),
                value: (p) => p.funded,
              ),
              TrendSeries(
                label: 'Released',
                color: palette.at(2),
                value: (p) => p.released,
              ),
            ],
          ),
        ),
        _gap,
        AppCard(
          title: 'Payroll distributed per cycle',
          child: BarChart(
            data: metrics.payrollPerCycle,
            color: palette.at(0),
            barPadding: 0.5,
          ),
        ),
        _gap,
        AppCard(
          title: 'Top freelancers',
          child: Leaderboard(items: metrics.topFreelancers),
        ),
      ],
    );
  }
}

class _FreelancerCharts extends StatelessWidget {
  const _FreelancerCharts({required this.metrics});

  final FreelancerMetrics metrics;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        AppCard(
          title: 'Earnings (last 6 months)',
          child: AreaChart(data: metrics.earningsPerMonth),
        ),
        _gap,
        AppCard(
          title: 'Milestones by status',
          child: DonutChart(
            data: metrics.milestonesByStatus,
            caption: 'milestones',
            label: (key) => statusLabel(StatusKind.milestone, key),
          ),
        ),
      ],
    );
  }
}

class _FixedEmployeeView extends StatelessWidget {
  const _FixedEmployeeView({required this.metrics});

  final FixedEmployeeMetrics metrics;

  @override
  Widget build(BuildContext context) {
    final palette = ChartPalette.of(context);
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: StatCard(
                label: 'Total received',
                value: formatUsdc(metrics.totalReceived.toStringAsFixed(2)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: StatCard(
                label: 'Payments received',
                value: '${metrics.paymentsCount}',
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        StatCard(
          label: 'Next payroll',
          value: metrics.nextRun == null
              ? emptyPlaceholder
              : formatDate(metrics.nextRun),
        ),
        _gap,
        AppCard(
          title: 'Payments received (last 6 months)',
          child: AreaChart(
            data: metrics.paymentsPerMonth,
            color: palette.at(2),
          ),
        ),
      ],
    );
  }
}
