/// Deliverable uploaded by the freelancer for a milestone.
///
/// Statuses: `submitted` (shown as "Delivered"), `changes_requested`,
/// `approved`.
class Deliverable {
  const Deliverable({
    required this.id,
    this.status,
    this.fileUrl,
    this.linkUrl,
    this.note,
    this.reviewNote,
    this.version,
    this.createdAt,
  });

  final String id;
  final String? status;
  final String? fileUrl;
  final String? linkUrl;
  final String? note;
  final String? reviewNote;
  final int? version;
  final String? createdAt;

  factory Deliverable.fromJson(Map<String, dynamic> json) {
    return Deliverable(
      id: (json['id'] ?? '').toString(),
      status: json['status']?.toString(),
      fileUrl: json['fileUrl'] as String?,
      linkUrl: json['linkUrl'] as String?,
      note: json['note'] as String?,
      reviewNote: json['reviewNote'] as String?,
      version: json['version'] is int
          ? json['version'] as int
          : int.tryParse('${json['version']}'),
      // The backend field is `submittedAt`.
      createdAt: (json['createdAt'] ?? json['submittedAt']) as String?,
    );
  }
}
