import 'deliverable.dart';

/// On-chain payment recorded for a milestone (release transaction).
class MilestoneTransaction {
  const MilestoneTransaction({
    required this.id,
    this.txHash,
    this.type,
    this.amount,
    this.createdAt,
  });

  final String id;
  final String? txHash;
  final String? type;
  final String? amount;
  final String? createdAt;

  /// Simulated-mode hashes start with `SIM` and have no explorer link.
  bool get isSimulated => (txHash ?? '').startsWith('SIM');

  factory MilestoneTransaction.fromJson(Map<String, dynamic> json) {
    return MilestoneTransaction(
      id: (json['id'] ?? '').toString(),
      // The backend serializes the hash as `stellarHash` and the kind of
      // operation (fund/release/refund) as `operation`.
      txHash: (json['txHash'] ?? json['stellarHash'])?.toString(),
      type: (json['type'] ?? json['operation'])?.toString(),
      amount: json['amount']?.toString(),
      createdAt: json['createdAt'] as String?,
    );
  }
}

/// Lightweight reference to a dispute attached to a milestone.
class MilestoneDisputeRef {
  const MilestoneDisputeRef({required this.id, required this.status});

  final String id;
  final String status;

  bool get isOpen =>
      status == 'open' || status == 'under_review' || status == 'escalated';

  factory MilestoneDisputeRef.fromJson(Map<String, dynamic> json) {
    return MilestoneDisputeRef(
      id: (json['id'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
    );
  }
}

/// Contract milestone.
///
/// Statuses: `pending`, `submitted`, `in_review`, `approved`, `released`
/// (shown as "Paid"), `disputed`.
class Milestone {
  const Milestone({
    required this.id,
    required this.status,
    required this.amount,
    this.title,
    this.description,
    this.deadline,
    this.position,
    this.deliverables = const [],
    this.transactions = const [],
    this.disputes = const [],
  });

  final String id;
  final String status;
  final String amount;
  final String? title;
  final String? description;
  final String? deadline;
  final int? position;
  final List<Deliverable> deliverables;
  final List<MilestoneTransaction> transactions;
  final List<MilestoneDisputeRef> disputes;

  /// The freelancer can upload deliverables while the milestone is in one
  /// of these states (and the contract is active).
  bool get acceptsDeliverables =>
      status == 'pending' || status == 'submitted' || status == 'in_review';

  /// The company can review (approve or request changes) in these states.
  bool get isReviewable => status == 'submitted' || status == 'in_review';

  bool get isReleased => status == 'released';
  bool get isDisputed => status == 'disputed';

  /// First open dispute on this milestone, if any.
  MilestoneDisputeRef? get openDispute {
    for (final dispute in disputes) {
      if (dispute.isOpen) return dispute;
    }
    return null;
  }

  factory Milestone.fromJson(Map<String, dynamic> json) {
    return Milestone(
      id: (json['id'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      amount: (json['amount'] ?? '0').toString(),
      title: json['title'] as String?,
      description: json['description'] as String?,
      deadline: json['deadline'] as String?,
      position: json['position'] is int
          ? json['position'] as int
          : int.tryParse('${json['position']}'),
      deliverables: (json['deliverables'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(Deliverable.fromJson)
          .toList(),
      transactions: (json['transactions'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(MilestoneTransaction.fromJson)
          .toList(),
      disputes: (json['disputes'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(MilestoneDisputeRef.fromJson)
          .toList(),
    );
  }
}
