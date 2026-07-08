/// Aggregated dashboard metrics returned by GET /metrics/summary, mirroring
/// the shared `SummaryMetrics` contract. All monetary values are plain USDC
/// numbers (Decimals are converted server-side); time series are bucketed
/// into the last months.
library;

double _num(dynamic value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0;
  return 0;
}

int _int(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}

/// A single labelled value in a time series or bar chart.
class MetricPoint {
  const MetricPoint({required this.label, required this.value});

  final String label;
  final double value;

  factory MetricPoint.fromJson(Map<String, dynamic> json) => MetricPoint(
    label: (json['label'] ?? '').toString(),
    value: _num(json['value']),
  );
}

/// A named slice of a categorical breakdown (donut or ranked bars).
class CategoryCount {
  const CategoryCount({required this.key, required this.value});

  /// Raw category key (an enum value such as a role or status).
  final String key;
  final double value;

  factory CategoryCount.fromJson(Map<String, dynamic> json) => CategoryCount(
    key: (json['key'] ?? '').toString(),
    value: _num(json['value']),
  );
}

/// A month bucket with the funded and released USDC totals for that month.
class FundingPoint {
  const FundingPoint({
    required this.label,
    required this.funded,
    required this.released,
  });

  final String label;
  final double funded;
  final double released;

  factory FundingPoint.fromJson(Map<String, dynamic> json) => FundingPoint(
    label: (json['label'] ?? '').toString(),
    funded: _num(json['funded']),
    released: _num(json['released']),
  );
}

/// A freelancer ranked by how many contracts they have taken on.
class TopFreelancer {
  const TopFreelancer({
    required this.name,
    required this.avatarUrl,
    required this.contracts,
  });

  final String name;
  final String? avatarUrl;
  final int contracts;

  factory TopFreelancer.fromJson(Map<String, dynamic> json) => TopFreelancer(
    name: (json['name'] ?? '').toString(),
    avatarUrl: json['avatarUrl'] as String?,
    contracts: _int(json['contracts']),
  );
}

List<T> _list<T>(dynamic value, T Function(Map<String, dynamic>) parse) {
  return (value as List<dynamic>? ?? const [])
      .whereType<Map<String, dynamic>>()
      .map(parse)
      .toList();
}

/// Role-scoped summary metrics returned by GET /metrics/summary. Concrete
/// subtypes: [CompanyMetrics], [FreelancerMetrics], [FixedEmployeeMetrics].
sealed class SummaryMetrics {
  const SummaryMetrics();

  /// Dispatches on the `role` discriminator, like the web union type.
  factory SummaryMetrics.fromJson(Map<String, dynamic> json) {
    return switch ((json['role'] ?? '').toString()) {
      'company' => CompanyMetrics.fromJson(json),
      'freelancer' => FreelancerMetrics.fromJson(json),
      'fixed_employee' => FixedEmployeeMetrics.fromJson(json),
      final role => throw FormatException('Unknown metrics role: $role'),
    };
  }
}

/// Company owner metrics (role = company).
class CompanyMetrics extends SummaryMetrics {
  const CompanyMetrics({
    required this.activeContracts,
    required this.usdcInEscrow,
    required this.payrollDistributed,
    required this.contractsByStatus,
    required this.payrollPerCycle,
    required this.fundingTrend,
    required this.topFreelancers,
  });

  final int activeContracts;
  final double usdcInEscrow;
  final double payrollDistributed;
  final List<CategoryCount> contractsByStatus;
  final List<MetricPoint> payrollPerCycle;
  final List<FundingPoint> fundingTrend;
  final List<TopFreelancer> topFreelancers;

  factory CompanyMetrics.fromJson(Map<String, dynamic> json) {
    final totals = json['totals'] as Map<String, dynamic>? ?? const {};
    return CompanyMetrics(
      activeContracts: _int(totals['activeContracts']),
      usdcInEscrow: _num(totals['usdcInEscrow']),
      payrollDistributed: _num(totals['payrollDistributed']),
      contractsByStatus: _list(json['contractsByStatus'], CategoryCount.fromJson),
      payrollPerCycle: _list(json['payrollPerCycle'], MetricPoint.fromJson),
      fundingTrend: _list(json['fundingTrend'], FundingPoint.fromJson),
      topFreelancers: _list(json['topFreelancers'], TopFreelancer.fromJson),
    );
  }
}

/// Freelancer metrics (role = freelancer).
class FreelancerMetrics extends SummaryMetrics {
  const FreelancerMetrics({
    required this.activeContracts,
    required this.totalEarned,
    required this.pendingValue,
    required this.earningsPerMonth,
    required this.milestonesByStatus,
  });

  final int activeContracts;
  final double totalEarned;
  final double pendingValue;
  final List<MetricPoint> earningsPerMonth;
  final List<CategoryCount> milestonesByStatus;

  factory FreelancerMetrics.fromJson(Map<String, dynamic> json) {
    final totals = json['totals'] as Map<String, dynamic>? ?? const {};
    return FreelancerMetrics(
      activeContracts: _int(totals['activeContracts']),
      totalEarned: _num(totals['totalEarned']),
      pendingValue: _num(totals['pendingValue']),
      earningsPerMonth: _list(json['earningsPerMonth'], MetricPoint.fromJson),
      milestonesByStatus:
          _list(json['milestonesByStatus'], CategoryCount.fromJson),
    );
  }
}

/// Fixed-employee metrics (role = fixed_employee).
class FixedEmployeeMetrics extends SummaryMetrics {
  const FixedEmployeeMetrics({
    required this.totalReceived,
    required this.paymentsCount,
    required this.nextRun,
    required this.paymentsPerMonth,
  });

  final double totalReceived;
  final int paymentsCount;

  /// ISO date of the next scheduled payroll run, if any.
  final String? nextRun;
  final List<MetricPoint> paymentsPerMonth;

  factory FixedEmployeeMetrics.fromJson(Map<String, dynamic> json) {
    final totals = json['totals'] as Map<String, dynamic>? ?? const {};
    return FixedEmployeeMetrics(
      totalReceived: _num(totals['totalReceived']),
      paymentsCount: _int(totals['paymentsCount']),
      nextRun: totals['nextRun'] as String?,
      paymentsPerMonth: _list(json['paymentsPerMonth'], MetricPoint.fromJson),
    );
  }
}
