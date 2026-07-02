import '../core/api_client.dart';
import '../domain/models/activity_log.dart';

/// Access to the /activity-logs endpoints (dashboard feed and admin view).
class ActivityRepository {
  ActivityRepository(this._api);

  final ApiClient _api;

  /// GET /activity-logs: the current user's activity.
  Future<List<ActivityLog>> mine() async {
    final json = await _api.get('/activity-logs');
    return (json as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(ActivityLog.fromJson)
        .toList();
  }

  /// GET /activity-logs/all (administrator): platform-wide activity with
  /// the acting user attached.
  Future<List<ActivityLog>> all() async {
    final json = await _api.get('/activity-logs/all');
    return (json as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(ActivityLog.fromJson)
        .toList();
  }
}
