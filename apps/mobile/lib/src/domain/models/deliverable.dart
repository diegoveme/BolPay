/// Entregable subido por el freelancer para un milestone.
class Deliverable {
  const Deliverable({
    required this.id,
    this.fileUrl,
    this.linkUrl,
    this.note,
    this.version,
    this.createdAt,
  });

  final String id;
  final String? fileUrl;
  final String? linkUrl;
  final String? note;
  final int? version;
  final String? createdAt;

  factory Deliverable.fromJson(Map<String, dynamic> json) {
    return Deliverable(
      id: (json['id'] ?? '').toString(),
      fileUrl: json['fileUrl'] as String?,
      linkUrl: json['linkUrl'] as String?,
      note: json['note'] as String?,
      version: json['version'] is int
          ? json['version'] as int
          : int.tryParse('${json['version']}'),
      createdAt: json['createdAt'] as String?,
    );
  }
}
