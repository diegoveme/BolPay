import '../core/api_client.dart';
import '../domain/models/metrics.dart';

/// Access to the /metrics endpoints that back the dashboard charts.
class MetricsRepository {
  MetricsRepository(this._api);

  final ApiClient _api;

  /// GET /metrics/summary: role-scoped metrics for the current user
  /// (company, freelancer or fixed employee). Administrators use the
  /// platform endpoint instead, which the mobile app does not consume.
  Future<SummaryMetrics> summary() async {
    final json = await _api.get('/metrics/summary');
    return SummaryMetrics.fromJson(json as Map<String, dynamic>);
  }
}
