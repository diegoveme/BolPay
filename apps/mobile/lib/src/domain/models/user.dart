/// Stellar wallet linked to a user.
class Wallet {
  const Wallet({required this.address, this.isPrimary = false});

  final String address;
  final bool isPrimary;

  factory Wallet.fromJson(Map<String, dynamic> json) {
    return Wallet(
      address:
          (json['address'] ?? json['stellarAddress'] ?? json['publicKey'] ?? '')
              .toString(),
      isPrimary: json['isPrimary'] == true || json['primary'] == true,
    );
  }
}

/// Public company profile. When parsed from a contract party payload it
/// also carries the owning user id and email (nested `user` object).
class CompanyProfile {
  const CompanyProfile({
    this.id,
    this.name,
    this.description,
    this.location,
    this.website,
    this.industry,
    this.values,
    this.avatarUrl,
    this.userId,
    this.userEmail,
  });

  final String? id;
  final String? name;
  final String? description;
  final String? location;
  final String? website;
  final String? industry;
  final String? values;
  final String? avatarUrl;
  final String? userId;
  final String? userEmail;

  factory CompanyProfile.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>?;
    return CompanyProfile(
      id: json['id']?.toString(),
      name: json['name'] as String?,
      description: json['description'] as String?,
      location: json['location'] as String?,
      website: json['website'] as String?,
      industry: json['industry'] as String?,
      values: json['values'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      userId: user?['id']?.toString(),
      userEmail: user?['email'] as String?,
    );
  }
}

/// Public freelancer profile. Same nested `user` handling as
/// [CompanyProfile].
class FreelancerProfile {
  const FreelancerProfile({
    this.id,
    this.displayName,
    this.headline,
    this.bio,
    this.skills = const [],
    this.location,
    this.website,
    this.linkedin,
    this.github,
    this.avatarUrl,
    this.userId,
    this.userEmail,
  });

  final String? id;
  final String? displayName;
  final String? headline;
  final String? bio;
  final List<String> skills;
  final String? location;
  final String? website;
  final String? linkedin;
  final String? github;
  final String? avatarUrl;
  final String? userId;
  final String? userEmail;

  factory FreelancerProfile.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>?;
    return FreelancerProfile(
      id: json['id']?.toString(),
      displayName: json['displayName'] as String?,
      headline: json['headline'] as String?,
      bio: json['bio'] as String?,
      skills: (json['skills'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList(),
      location: json['location'] as String?,
      website: json['website'] as String?,
      linkedin: json['linkedin'] as String?,
      github: json['github'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      userId: user?['id']?.toString(),
      userEmail: user?['email'] as String?,
    );
  }
}

/// Authenticated BolPay user.
///
/// Roles: `company`, `freelancer`, `fixed_employee`, `administrator`.
class User {
  const User({
    required this.id,
    required this.email,
    required this.role,
    this.name,
    this.emailVerified = false,
    this.stellarAddress,
    this.wallets = const [],
    this.companyProfile,
    this.freelancerProfile,
    this.createdAt,
  });

  final String id;
  final String email;
  final String role;
  final String? name;
  final bool emailVerified;
  final String? stellarAddress;
  final List<Wallet> wallets;
  final CompanyProfile? companyProfile;
  final FreelancerProfile? freelancerProfile;
  final String? createdAt;

  bool get isCompany => role == 'company';
  bool get isFreelancer => role == 'freelancer';
  bool get isAdministrator => role == 'administrator';

  /// Best display name: profile name, then account name, then email.
  String get displayName {
    final freelancerName = freelancerProfile?.displayName;
    if (freelancerName != null && freelancerName.isNotEmpty) {
      return freelancerName;
    }
    final companyName = companyProfile?.name;
    if (companyName != null && companyName.isNotEmpty) return companyName;
    if (name != null && name!.isNotEmpty) return name!;
    return email;
  }

  factory User.fromJson(Map<String, dynamic> json) {
    final wallets = (json['wallets'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(Wallet.fromJson)
        .toList();
    final primaryWallet = wallets
        .where((w) => w.address.isNotEmpty)
        .fold<Wallet?>(null, (found, w) => found ?? (w.isPrimary ? w : null));
    return User(
      id: (json['id'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      role: (json['role'] ?? '').toString(),
      name: json['name'] as String?,
      emailVerified: json['emailVerified'] == true,
      stellarAddress:
          json['stellarAddress'] as String? ??
          primaryWallet?.address ??
          (wallets.isNotEmpty ? wallets.first.address : null),
      wallets: wallets,
      companyProfile: json['companyProfile'] is Map<String, dynamic>
          ? CompanyProfile.fromJson(
              json['companyProfile'] as Map<String, dynamic>,
            )
          : null,
      freelancerProfile: json['freelancerProfile'] is Map<String, dynamic>
          ? FreelancerProfile.fromJson(
              json['freelancerProfile'] as Map<String, dynamic>,
            )
          : null,
      createdAt: json['createdAt'] as String?,
    );
  }
}
