import '../core/api_client.dart';
import '../domain/models/notification_item.dart';

/// Access to the /notifications endpoints.
class NotificationsRepository {
  NotificationsRepository(this._api);

  final ApiClient _api;

  /// GET /notifications, optionally only the unread ones.
  Future<List<NotificationItem>> list({bool unreadOnly = false}) async {
    final json = await _api.get(
      '/notifications',
      query: {if (unreadOnly) 'unread': 'true'},
    );
    return (json as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(NotificationItem.fromJson)
        .toList();
  }

  /// Unread count for the bell badge (length of the unread list, like
  /// the web).
  Future<int> unreadCount() async {
    final items = await list(unreadOnly: true);
    return items.length;
  }

  /// POST /notifications/:id/read.
  Future<void> markRead(String id) async {
    await _api.post('/notifications/$id/read');
  }

  /// POST /notifications/read-all.
  Future<void> markAllRead() async {
    await _api.post('/notifications/read-all');
  }

  /// DELETE /notifications/:id.
  Future<void> delete(String id) async {
    await _api.delete('/notifications/$id');
  }
}
