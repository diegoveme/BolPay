import 'escrow.dart';
import 'milestone.dart';
import 'user.dart';

/// Freelance contract between a company and a freelancer.
///
/// Statuses: `draft`, `pending_acceptance`, `changes_requested`,
/// `accepted`, `active`, `completed`, `rejected`.
class Contract {
  const Contract({
    required this.id,
    required this.title,
    required this.status,
    required this.totalAmount,
    this.description,
    this.deadline,
    this.company,
    this.freelancer,
    this.invitedEmail,
    this.escrow,
    this.reviewNote,
    this.milestones = const [],
    this.createdAt,
  });

  final String id;
  final String title;
  final String status;
  final String totalAmount;
  final String? description;
  final String? deadline;

  /// Company party profile (includes the owning user id and email).
  final CompanyProfile? company;

  /// Freelancer party profile (includes the owning user id and email).
  final FreelancerProfile? freelancer;

  /// Email invited to claim the freelancer side, when there is no
  /// freelancer yet.
  final String? invitedEmail;

  final Escrow? escrow;
  final String? reviewNote;
  final List<Milestone> milestones;
  final String? createdAt;

  bool get isPendingAcceptance => status == 'pending_acceptance';
  bool get isActive => status == 'active';

  /// The company can edit the contract in these states.
  bool get isEditable => status == 'draft' || status == 'changes_requested';

  String? get companyName => company?.name;
  String? get freelancerName => freelancer?.displayName ?? invitedEmail;

  int get releasedMilestones =>
      milestones.where((m) => m.status == 'released').length;

  factory Contract.fromJson(Map<String, dynamic> json) {
    return Contract(
      id: (json['id'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      totalAmount: (json['totalAmount'] ?? '0').toString(),
      description: json['description'] as String?,
      deadline: json['deadline'] as String?,
      company: json['company'] is Map<String, dynamic>
          ? CompanyProfile.fromJson(json['company'] as Map<String, dynamic>)
          : null,
      freelancer: json['freelancer'] is Map<String, dynamic>
          ? FreelancerProfile.fromJson(
              json['freelancer'] as Map<String, dynamic>,
            )
          : null,
      invitedEmail: json['invitedEmail'] as String?,
      escrow: json['escrow'] is Map<String, dynamic>
          ? Escrow.fromJson(json['escrow'] as Map<String, dynamic>)
          : null,
      reviewNote: json['reviewNote'] as String?,
      milestones: (json['milestones'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(Milestone.fromJson)
          .toList(),
      createdAt: json['createdAt'] as String?,
    );
  }
}
