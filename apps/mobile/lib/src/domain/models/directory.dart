/// Freelancer entry returned by the directory search
/// (GET /users/freelancers): profile summary plus the owning user.
class FreelancerOption {
  const FreelancerOption({
    required this.profileId,
    required this.email,
    this.displayName,
    this.headline,
    this.avatarUrl,
  });

  /// FreelancerProfile id, NOT the user id. This is what POST /contracts
  /// expects as `freelancerId`; sending the user id returns "Freelancer not
  /// found" (web parity: the web select uses this same id).
  final String profileId;
  final String email;
  final String? displayName;
  final String? headline;
  final String? avatarUrl;

  /// "{displayName} ({email})" label used by the typeahead field.
  String get label {
    final name = displayName;
    if (name == null || name.isEmpty) return email;
    return '$name ($email)';
  }

  factory FreelancerOption.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>?;
    return FreelancerOption(
      profileId: (json['id'] ?? '').toString(),
      email: (user?['email'] ?? json['email'] ?? '').toString(),
      displayName: json['displayName'] as String?,
      headline: json['headline'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
    );
  }
}

/// Employee entry returned by GET /users/employees. Only employees with a
/// Stellar address are payable through payroll.
class EmployeeOption {
  const EmployeeOption({
    required this.id,
    required this.email,
    this.name,
    this.stellarAddress,
  });

  final String id;
  final String email;
  final String? name;
  final String? stellarAddress;

  bool get isPayable => stellarAddress != null && stellarAddress!.isNotEmpty;

  factory EmployeeOption.fromJson(Map<String, dynamic> json) {
    return EmployeeOption(
      id: (json['id'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      name: json['name'] as String?,
      stellarAddress: json['stellarAddress'] as String?,
    );
  }
}
