import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:bolpay_mobile/src/domain/models/metrics.dart';
import 'package:bolpay_mobile/src/features/dashboard/widgets/dashboard_metrics.dart';
import 'package:bolpay_mobile/src/ui/theme.dart';

/// Pumps [metrics] inside a scrollable, themed harness and lets the frame
/// paint, so the chart CustomPainters run for real.
Future<void> _pump(WidgetTester tester, SummaryMetrics metrics) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      home: Scaffold(
        body: SingleChildScrollView(
          child: DashboardMetrics(metrics: metrics),
        ),
      ),
    ),
  );
  await tester.pump();
}

void main() {
  const contractsByStatus = [
    CategoryCount(key: 'active', value: 4),
    CategoryCount(key: 'completed', value: 2),
    CategoryCount(key: 'pending_acceptance', value: 1),
  ];
  const fundingTrend = [
    FundingPoint(label: 'Jan', funded: 1200, released: 800),
    FundingPoint(label: 'Feb', funded: 3400, released: 2100),
    FundingPoint(label: 'Mar', funded: 900, released: 900),
  ];
  const perCycle = [
    MetricPoint(label: 'C1', value: 500),
    MetricPoint(label: 'C2', value: 1500),
    MetricPoint(label: 'C3', value: 750),
  ];

  testWidgets('company charts paint without overflow', (tester) async {
    await _pump(
      tester,
      const CompanyMetrics(
        activeContracts: 4,
        usdcInEscrow: 5000,
        payrollDistributed: 2750,
        contractsByStatus: contractsByStatus,
        payrollPerCycle: perCycle,
        fundingTrend: fundingTrend,
        topFreelancers: [
          TopFreelancer(name: 'Ada Lovelace', avatarUrl: null, contracts: 3),
          TopFreelancer(name: 'Alan Turing', avatarUrl: null, contracts: 1),
        ],
      ),
    );
    expect(find.text('Contracts by status'), findsOneWidget);
    expect(find.text('Top freelancers'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('freelancer charts paint without overflow', (tester) async {
    await _pump(
      tester,
      const FreelancerMetrics(
        activeContracts: 2,
        totalEarned: 4200,
        pendingValue: 1000,
        earningsPerMonth: [
          MetricPoint(label: 'Jan', value: 800),
          MetricPoint(label: 'Feb', value: 2200),
        ],
        milestonesByStatus: [
          CategoryCount(key: 'released', value: 5),
          CategoryCount(key: 'pending', value: 2),
        ],
      ),
    );
    expect(find.text('Earnings (last 6 months)'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('fixed-employee view paints without overflow', (tester) async {
    await _pump(
      tester,
      const FixedEmployeeMetrics(
        totalReceived: 3000,
        paymentsCount: 6,
        nextRun: '2026-08-01T00:00:00.000Z',
        paymentsPerMonth: [
          MetricPoint(label: 'Jun', value: 1000),
          MetricPoint(label: 'Jul', value: 2000),
        ],
      ),
    );
    expect(find.text('Total received'), findsOneWidget);
    expect(find.text('Payments received (last 6 months)'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('empty series render the no-data placeholder', (tester) async {
    await _pump(
      tester,
      const CompanyMetrics(
        activeContracts: 0,
        usdcInEscrow: 0,
        payrollDistributed: 0,
        contractsByStatus: [],
        payrollPerCycle: [],
        fundingTrend: [],
        topFreelancers: [],
      ),
    );
    expect(find.text('No data yet'), findsWidgets);
    expect(find.text('No freelancers with contracts yet.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
