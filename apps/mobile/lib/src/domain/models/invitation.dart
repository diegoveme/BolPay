/// Email invitation created by a company or administrator.
///
/// Statuses: `pending`, `accepted`, plus terminal states like `revoked`
/// or `expired`.
class Invitation {
  const Invitation({
    required this.id,
    required this.email,
    required this.role,
    required this.status,
    this.token,
    this.expiresAt,
    this.createdAt,
  });

  final String id;
  final String email;
  final String role;
  final String status;

  /// Only present in the create response; the web copies it to the
  /// clipboard.
  final String? token;

  final String? expiresAt;
  final String? createdAt;

  factory Invitation.fromJson(Map<String, dynamic> json) {
    return Invitation(
      id: (json['id'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      role: (json['role'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      token: json['token']?.toString(),
      expiresAt: json['expiresAt'] as String?,
      createdAt: json['createdAt'] as String?,
    );
  }
}
