import '../core/api_client.dart';
import '../domain/models/notification_item.dart';

/// Acceso a los endpoints de notificaciones.
class NotificationsRepository {
  NotificationsRepository(this._api);

  final ApiClient _api;

  Future<List<NotificationItem>> list() async {
    final json = await _api.get('/notifications');
    return (json as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(NotificationItem.fromJson)
        .toList();
  }

  Future<void> markRead(String id) async {
    await _api.post('/notifications/$id/read');
  }

  Future<void> markAllRead() async {
    await _api.post('/notifications/read-all');
  }
}
