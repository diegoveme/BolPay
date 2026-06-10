/// Notificación del usuario.
class NotificationItem {
  const NotificationItem({
    required this.id,
    required this.type,
    required this.message,
    required this.read,
    this.data,
    this.createdAt,
  });

  final String id;
  final String type;
  final String message;
  final bool read;
  final Map<String, dynamic>? data;
  final String? createdAt;

  NotificationItem copyWith({bool? read}) {
    return NotificationItem(
      id: id,
      type: type,
      message: message,
      read: read ?? this.read,
      data: data,
      createdAt: createdAt,
    );
  }

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: (json['id'] ?? '').toString(),
      type: (json['type'] ?? '').toString(),
      message: (json['message'] ?? '').toString(),
      read: json['read'] == true,
      data: json['data'] as Map<String, dynamic>?,
      createdAt: json['createdAt'] as String?,
    );
  }
}
