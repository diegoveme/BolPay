/// On-chain escrow (Trustless Work on Stellar) backing a contract or a
/// payroll cycle.
///
/// `mode` is `simulated` or `trustless_work`; statuses include `created`,
/// `funded`, `released` and `disputed`.
class Escrow {
  const Escrow({
    required this.id,
    required this.status,
    this.mode,
    this.type,
    this.trustlessWorkId,
    this.fundedAmount,
    this.releasedAmount,
    this.contractId,
    this.contractTitle,
    this.payrollId,
    this.payrollName,
    this.createdAt,
  });

  final String id;
  final String status;
  final String? mode;
  final String? type;
  final String? trustlessWorkId;
  final String? fundedAmount;
  final String? releasedAmount;
  final String? contractId;
  final String? contractTitle;
  final String? payrollId;
  final String? payrollName;
  final String? createdAt;

  bool get isFunded => status == 'funded';
  bool get isCreated => status == 'created';

  /// Source label for the admin escrows table (contract title or payroll
  /// name).
  String? get sourceLabel => contractTitle ?? payrollName;

  factory Escrow.fromJson(Map<String, dynamic> json) {
    final contract = json['contract'] as Map<String, dynamic>?;
    final payroll = json['payroll'] as Map<String, dynamic>?;
    return Escrow(
      id: (json['id'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      mode: json['mode']?.toString(),
      type: json['type']?.toString(),
      trustlessWorkId: json['trustlessWorkId']?.toString(),
      fundedAmount: json['fundedAmount']?.toString(),
      releasedAmount: json['releasedAmount']?.toString(),
      contractId: (json['contractId'] ?? contract?['id'])?.toString(),
      contractTitle: contract?['title'] as String?,
      payrollId: (json['payrollId'] ?? payroll?['id'])?.toString(),
      payrollName: payroll?['name'] as String?,
      createdAt: json['createdAt'] as String?,
    );
  }
}

/// Result of the USDC trustline check for a wallet address.
class TrustlineStatus {
  const TrustlineStatus({required this.funded, required this.hasTrustline});

  final bool funded;
  final bool hasTrustline;

  factory TrustlineStatus.fromJson(Map<String, dynamic> json) {
    return TrustlineStatus(
      funded: json['funded'] == true,
      hasTrustline: json['hasTrustline'] == true,
    );
  }
}
