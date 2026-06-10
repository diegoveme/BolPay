/// Escrow en Stellar (Trustless Work) asociado a un contrato.
class Escrow {
  const Escrow({required this.status, this.trustlessWorkId});

  final String status;
  final String? trustlessWorkId;

  factory Escrow.fromJson(Map<String, dynamic> json) {
    return Escrow(
      status: (json['status'] ?? '').toString(),
      trustlessWorkId: json['trustlessWorkId']?.toString(),
    );
  }
}
