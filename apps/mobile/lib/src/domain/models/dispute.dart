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
/// funds stay locked in escrow. Resolution is mutual: one party proposes a
/// split and the OTHER party accepts it (or counter-proposes) before it runs
/// on-chain. `proposedById != null` means a proposal is on the table.
///
/// Statuses: `open`, `under_review`, `escalated`, `agreed`, `resolved`,
/// `closed`. Accepting a proposal that pays the freelancer does NOT settle:
/// the dispute becomes `agreed` and the milestone reopens so the freelancer
/// delivers and the company approves before any funds move. A pure refund to
/// the company goes straight to `resolved`.
///
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
    this.proposalOutcome,
    this.proposalFreelancerAmount,
    this.proposalCompanyAmount,
    this.proposalNote,
    this.proposedById,
    this.proposedByEmail,
    this.proposedAt,
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
  // Standing resolution proposal awaiting the other party's acceptance.
  final String? proposalOutcome;
  final String? proposalFreelancerAmount;
  final String? proposalCompanyAmount;
  final String? proposalNote;
  final String? proposedById;
  final String? proposedByEmail;
  final String? proposedAt;
  final List<DisputeEvidence> evidence;
  final String? createdAt;
  final String? resolvedAt;

  static const openStates = {'open', 'under_review'};

  bool get isOpen => openStates.contains(status);
  bool get isResolved => status == 'resolved';

  /// Split agreed by both parties, pending delivery and approval. No funds
  /// have moved yet.
  bool get isAgreed => status == 'agreed';

  /// Whether the standing proposal pays the freelancer anything. If it does,
  /// accepting it locks in the agreement instead of settling on the spot.
  bool get proposalPaysFreelancer =>
      (double.tryParse(proposalFreelancerAmount ?? '0') ?? 0) > 0;

  /// Whether a resolution proposal is currently on the table.
  bool get hasProposal =>
      proposedById != null && proposedById!.isNotEmpty;

  factory Dispute.fromJson(Map<String, dynamic> json) {
    final openedBy = json['openedBy'] as Map<String, dynamic>?;
    final proposedBy = json['proposedBy'] as Map<String, dynamic>?;
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
      proposalOutcome: json['proposalOutcome']?.toString(),
      proposalFreelancerAmount: json['proposalFreelancerAmount']?.toString(),
      proposalCompanyAmount: json['proposalCompanyAmount']?.toString(),
      proposalNote: json['proposalNote'] as String?,
      proposedById: (json['proposedById'] ?? proposedBy?['id'])?.toString(),
      proposedByEmail: proposedBy?['email'] as String?,
      proposedAt: json['proposedAt'] as String?,
      evidence: (json['evidence'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(DisputeEvidence.fromJson)
          .toList(),
      createdAt: json['createdAt'] as String?,
      resolvedAt: json['resolvedAt'] as String?,
    );
  }
}
