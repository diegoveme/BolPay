/// Evidence or comment attached to a dispute.
class DisputeEvidence {
  const DisputeEvidence({
    required this.id,
    this.comment,
    this.fileUrl,
    this.submitterEmail,
    this.createdAt,
  });

  final String id;
  final String? comment;
  final String? fileUrl;
  final String? submitterEmail;
  final String? createdAt;

  factory DisputeEvidence.fromJson(Map<String, dynamic> json) {
    final submitter =
        json['submittedBy'] as Map<String, dynamic>? ??
        json['user'] as Map<String, dynamic>?;
    return DisputeEvidence(
      id: (json['id'] ?? '').toString(),
      comment: json['comment'] as String?,
      fileUrl: json['fileUrl'] as String?,
      submitterEmail:
          submitter?['email'] as String? ?? json['submitterEmail'] as String?,
      createdAt: json['createdAt'] as String?,
    );
  }
}

/// Milestone summary embedded in a dispute, including the contract chain.
class DisputeMilestone {
  const DisputeMilestone({
    required this.id,
    this.title,
    this.amount,
    this.contractId,
    this.contractTitle,
  });

  final String id;
  final String? title;
  final String? amount;
  final String? contractId;
  final String? contractTitle;

  factory DisputeMilestone.fromJson(Map<String, dynamic> json) {
    final contract = json['contract'] as Map<String, dynamic>?;
    return DisputeMilestone(
      id: (json['id'] ?? '').toString(),
      title: json['title'] as String?,
      amount: json['amount']?.toString(),
      contractId: (contract?['id'] ?? json['contractId'])?.toString(),
      contractTitle: contract?['title'] as String?,
    );
  }
}

/// Dispute over a milestone. While open, the milestone is paused and the
/// funds stay locked in escrow.
///
/// Statuses: `open`, `under_review`, `escalated`, `resolved`, `closed`.
/// Resolution outcomes: `release_to_freelancer`, `refund_to_company`,
/// `split`.
class Dispute {
  const Dispute({
    required this.id,
    required this.status,
    required this.reason,
    this.milestone,
    this.openedById,
    this.openedByEmail,
    this.resolvedByEmail,
    this.outcome,
    this.resolution,
    this.freelancerAmount,
    this.companyAmount,
    this.evidence = const [],
    this.createdAt,
    this.resolvedAt,
  });

  final String id;
  final String status;
  final String reason;
  final DisputeMilestone? milestone;
  final String? openedById;
  final String? openedByEmail;
  final String? resolvedByEmail;
  final String? outcome;
  final String? resolution;
  final String? freelancerAmount;
  final String? companyAmount;
  final List<DisputeEvidence> evidence;
  final String? createdAt;
  final String? resolvedAt;

  static const openStates = {'open', 'under_review', 'escalated'};

  bool get isOpen => openStates.contains(status);
  bool get isResolved => status == 'resolved';

  factory Dispute.fromJson(Map<String, dynamic> json) {
    final openedBy = json['openedBy'] as Map<String, dynamic>?;
    final resolvedBy = json['resolvedBy'] as Map<String, dynamic>?;
    return Dispute(
      id: (json['id'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      reason: (json['reason'] ?? '').toString(),
      milestone: json['milestone'] is Map<String, dynamic>
          ? DisputeMilestone.fromJson(json['milestone'] as Map<String, dynamic>)
          : null,
      openedById: (json['openedById'] ?? openedBy?['id'])?.toString(),
      openedByEmail: openedBy?['email'] as String?,
      resolvedByEmail: resolvedBy?['email'] as String?,
      outcome: json['outcome']?.toString(),
      resolution: json['resolution'] as String?,
      freelancerAmount: json['freelancerAmount']?.toString(),
      companyAmount: json['companyAmount']?.toString(),
      evidence: (json['evidence'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(DisputeEvidence.fromJson)
          .toList(),
      createdAt: json['createdAt'] as String?,
      resolvedAt: json['resolvedAt'] as String?,
    );
  }
}
