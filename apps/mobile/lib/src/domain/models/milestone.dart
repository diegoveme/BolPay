import 'deliverable.dart';

/// Estados posibles de un milestone:
/// pending, submitted, in_review, approved, released, disputed.
class Milestone {
  const Milestone({
    required this.id,
    required this.status,
    required this.amount,
    this.title,
    this.description,
    this.deliverables = const [],
    this.transactions = const [],
  });

  final String id;
  final String status;
  final String amount;
  final String? title;
  final String? description;
  final List<Deliverable> deliverables;
  final List<Map<String, dynamic>> transactions;

  /// El freelancer puede subir entregables solo en estos estados.
  bool get acceptsDeliverables => status == 'pending' || status == 'submitted';

  factory Milestone.fromJson(Map<String, dynamic> json) {
    return Milestone(
      id: (json['id'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      amount: (json['amount'] ?? '0').toString(),
      title: json['title'] as String?,
      description: json['description'] as String?,
      deliverables: (json['deliverables'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(Deliverable.fromJson)
          .toList(),
      transactions: (json['transactions'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .toList(),
    );
  }
}
