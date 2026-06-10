import 'escrow.dart';
import 'milestone.dart';

/// Estados posibles de un contrato:
/// draft, pending_acceptance, changes_requested, accepted, active,
/// completed, rejected.
class Contract {
  const Contract({
    required this.id,
    required this.title,
    required this.status,
    required this.totalAmount,
    this.description,
    this.companyName,
    this.freelancerName,
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
  final String? companyName;
  final String? freelancerName;
  final Escrow? escrow;
  final String? reviewNote;
  final List<Milestone> milestones;
  final String? createdAt;

  bool get isPendingAcceptance => status == 'pending_acceptance';
  bool get isActive => status == 'active';

  int get releasedMilestones =>
      milestones.where((m) => m.status == 'released').length;

  factory Contract.fromJson(Map<String, dynamic> json) {
    final company = json['company'] as Map<String, dynamic>?;
    final freelancer = json['freelancer'] as Map<String, dynamic>?;
    return Contract(
      id: (json['id'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      totalAmount: (json['totalAmount'] ?? '0').toString(),
      description: json['description'] as String?,
      companyName: company?['name'] as String?,
      freelancerName: freelancer?['displayName'] as String?,
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
