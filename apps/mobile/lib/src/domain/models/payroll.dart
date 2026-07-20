import 'escrow.dart';

/// Recipient line inside a payroll (a platform user or an external
/// wallet address).
class PayrollItem {
  const PayrollItem({
    required this.id,
    required this.amount,
    this.recipientUserId,
    this.recipientAddress,
    this.recipientLabel,
    this.recipientEmail,
    this.recipientName,
  });

  final String id;
  final String amount;
  final String? recipientUserId;
  final String? recipientAddress;
  final String? recipientLabel;
  final String? recipientEmail;
  final String? recipientName;

  /// Display name for the recipients table: label, then employee email,
  /// then a generic external-wallet fallback.
  String get displayLabel =>
      recipientLabel ?? recipientEmail ?? recipientName ?? 'External wallet';

  factory PayrollItem.fromJson(Map<String, dynamic> json) {
    final employee =
        json['recipientUser'] as Map<String, dynamic>? ??
        json['employee'] as Map<String, dynamic>?;
    return PayrollItem(
      id: (json['id'] ?? '').toString(),
      amount: (json['amount'] ?? '0').toString(),
      recipientUserId: (json['recipientUserId'] ?? employee?['id'])?.toString(),
      recipientAddress:
          json['recipientAddress'] as String? ??
          employee?['stellarAddress'] as String?,
      recipientLabel: json['recipientLabel'] as String?,
      recipientEmail: employee?['email'] as String?,
      recipientName: employee?['name'] as String?,
    );
  }
}

/// One on-chain transfer inside a payroll execution.
class PayrollTransaction {
  const PayrollTransaction({required this.id, this.amount, this.txHash});

  final String id;
  final String? amount;
  final String? txHash;

  /// Simulated-mode hashes start with `SIM` and have no explorer link.
  bool get isSimulated => (txHash ?? '').startsWith('SIM');

  factory PayrollTransaction.fromJson(Map<String, dynamic> json) {
    return PayrollTransaction(
      id: (json['id'] ?? '').toString(),
      amount: json['amount']?.toString(),
      // The backend serializes the hash as `stellarHash` (Prisma column);
      // reading only `txHash` left every payroll transaction without one.
      txHash: (json['txHash'] ?? json['stellarHash'])?.toString(),
    );
  }
}

/// One executed payroll cycle.
///
/// Statuses: `succeeded`, `failed`, `partial`, `pending`.
class PayrollExecution {
  const PayrollExecution({
    required this.id,
    required this.status,
    this.totalAmount,
    this.executedAt,
    this.transactions = const [],
  });

  final String id;
  final String status;
  final String? totalAmount;
  final String? executedAt;
  final List<PayrollTransaction> transactions;

  factory PayrollExecution.fromJson(Map<String, dynamic> json) {
    return PayrollExecution(
      id: (json['id'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      totalAmount: json['totalAmount']?.toString(),
      executedAt: (json['executedAt'] ?? json['createdAt']) as String?,
      transactions: (json['transactions'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(PayrollTransaction.fromJson)
          .toList(),
    );
  }
}

/// Recurring payroll paid from a funded cycle escrow.
///
/// Statuses: `draft`, `funded`, `active`, `paused`, `completed` (shown as
/// "Archived"). Frequencies: `weekly`, `biweekly`, `monthly`.
class Payroll {
  const Payroll({
    required this.id,
    required this.name,
    required this.status,
    required this.frequency,
    this.nextRun,
    this.escrow,
    this.items = const [],
    this.executions = const [],
    this.createdAt,
  });

  final String id;
  final String name;
  final String status;
  final String frequency;
  final String? nextRun;
  final Escrow? escrow;
  final List<PayrollItem> items;
  final List<PayrollExecution> executions;
  final String? createdAt;

  /// The payroll can be edited or funded in these states.
  bool get canEdit =>
      status == 'draft' || status == 'active' || status == 'paused';

  /// Sum of item amounts, as a decimal string with 2 decimals.
  String get totalPerCycle {
    var total = 0.0;
    for (final item in items) {
      total += double.tryParse(item.amount) ?? 0;
    }
    return total.toStringAsFixed(2);
  }

  /// English label for the frequency.
  String get frequencyLabel => switch (frequency) {
    'weekly' => 'Weekly',
    'biweekly' => 'Biweekly',
    'monthly' => 'Monthly',
    _ => frequency,
  };

  factory Payroll.fromJson(Map<String, dynamic> json) {
    return Payroll(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      frequency: (json['frequency'] ?? '').toString(),
      nextRun: json['nextRun'] as String?,
      escrow: json['escrow'] is Map<String, dynamic>
          ? Escrow.fromJson(json['escrow'] as Map<String, dynamic>)
          : null,
      items: (json['items'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(PayrollItem.fromJson)
          .toList(),
      executions: (json['executions'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(PayrollExecution.fromJson)
          .toList(),
      createdAt: json['createdAt'] as String?,
    );
  }
}
