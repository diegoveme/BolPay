/// Wallet Stellar asociada al usuario.
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

/// Usuario autenticado de BolPay.
class User {
  const User({
    required this.id,
    required this.email,
    required this.role,
    this.name,
    this.wallets = const [],
    this.companyProfile,
    this.freelancerProfile,
  });

  final String id;
  final String email;
  final String role;
  final String? name;
  final List<Wallet> wallets;
  final Map<String, dynamic>? companyProfile;
  final Map<String, dynamic>? freelancerProfile;

  String get displayName {
    final profileName = freelancerProfile?['displayName'] as String?;
    if (profileName != null && profileName.isNotEmpty) return profileName;
    if (name != null && name!.isNotEmpty) return name!;
    return email;
  }

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: (json['id'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      role: (json['role'] ?? '').toString(),
      name: json['name'] as String?,
      wallets: (json['wallets'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(Wallet.fromJson)
          .toList(),
      companyProfile: json['companyProfile'] as Map<String, dynamic>?,
      freelancerProfile: json['freelancerProfile'] as Map<String, dynamic>?,
    );
  }
}
