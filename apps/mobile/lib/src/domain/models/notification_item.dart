/// User notification. Its `data` payload can carry entity ids used for
/// deep linking (disputeId, contractId, payrollId).
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

  String? get contractId => data?['contractId']?.toString();
  String? get disputeId => data?['disputeId']?.toString();
  String? get payrollId => data?['payrollId']?.toString();

  /// In-app route this notification links to, if any. Dispute wins over
  /// contract, which wins over payroll (web parity).
  String? get deepLink {
    // Payment-received notifications go to the recipient's own dashboard:
    // the payroll page they came from is company-only, so a fixed employee
    // cannot open it. Their home shows the payments they received.
    if (type == 'payroll_payment_received') return '/dashboard';
    if (disputeId != null) return '/disputes/$disputeId';
    if (contractId != null) return '/contracts/$contractId';
    if (payrollId != null) return '/payrolls/$payrollId';
    return null;
  }

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
      data: json['data'] is Map<String, dynamic>
          ? json['data'] as Map<String, dynamic>
          : null,
      createdAt: json['createdAt'] as String?,
    );
  }
}
