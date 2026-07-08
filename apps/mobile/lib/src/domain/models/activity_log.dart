/// Activity log entry ("escrow.funded", "contract.sent", ...).
class ActivityLog {
  const ActivityLog({
    required this.id,
    required this.event,
    this.userEmail,
    this.userRole,
    this.createdAt,
  });

  final String id;
  final String event;
  final String? userEmail;
  final String? userRole;
  final String? createdAt;

  factory ActivityLog.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>?;
    return ActivityLog(
      id: (json['id'] ?? '').toString(),
      event: (json['event'] ?? '').toString(),
      userEmail: user?['email'] as String?,
      userRole: user?['role'] as String?,
      createdAt: json['createdAt'] as String?,
    );
  }
}

/// Human-readable English label for an activity event (web parity with
/// `activityLabel` in labels.ts). Unknown events fall back to the raw key.
String activityLabel(String event) {
  return switch (event) {
    'contract.created' => 'Created a contract',
    'contract.updated' => 'Updated a contract',
    'contract.sent' => 'Sent a contract to the freelancer',
    'contract.accepted' => 'Accepted a contract',
    'contract.rejected' => 'Rejected a contract',
    'contract.changes_requested' => 'Requested changes on a contract',
    'contract.completed' => 'Completed a contract',
    'escrow.funded' => 'Funded the escrow',
    'escrow.released' => 'Released funds from the escrow',
    'milestone.delivered' => 'Delivered a milestone',
    'milestone.approved' => 'Approved a milestone',
    'milestone.changes_requested' => 'Requested changes on a milestone',
    'deliverable.submitted' => 'Submitted a deliverable',
    'dispute.opened' => 'Opened a dispute',
    'dispute.escalated' => 'Escalated a dispute',
    'dispute.resolved' => 'Resolved a dispute',
    'dispute.evidence_added' => 'Added evidence to a dispute',
    'payroll.created' => 'Created a payroll',
    'payroll.updated' => 'Updated a payroll',
    'payroll.funded' => 'Funded a payroll cycle',
    'payroll.executed' => 'Ran a payroll cycle',
    'payroll.paused' => 'Paused a payroll',
    'payroll.resumed' => 'Resumed a payroll',
    'payroll.archived' => 'Archived a payroll',
    'user.invited' => 'Sent an invitation',
    'user.logged_in' => 'Signed in',
    _ => event,
  };
}
