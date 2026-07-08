import '../core/api_client.dart';
import '../domain/models/payroll.dart';

/// Input for a payroll recipient line. Provide either [recipientUserId]
/// (platform employee) or [recipientAddress] (external wallet).
class PayrollItemInput {
  const PayrollItemInput({
    required this.amount,
    this.recipientUserId,
    this.recipientAddress,
    this.recipientLabel,
  });

  final String amount;
  final String? recipientUserId;
  final String? recipientAddress;
  final String? recipientLabel;

  Map<String, dynamic> toJson() => {
    'amount': amount,
    if (recipientUserId != null && recipientUserId!.isNotEmpty)
      'recipientUserId': recipientUserId,
    if (recipientAddress != null && recipientAddress!.isNotEmpty)
      'recipientAddress': recipientAddress,
    if (recipientLabel != null && recipientLabel!.isNotEmpty)
      'recipientLabel': recipientLabel,
  };
}

/// Access to the /payrolls endpoints (company; administrator passes).
class PayrollRepository {
  PayrollRepository(this._api);

  final ApiClient _api;

  /// GET /payrolls.
  Future<List<Payroll>> list() async {
    final json = await _api.get('/payrolls');
    return (json as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(Payroll.fromJson)
        .toList();
  }

  /// GET /payrolls/:id.
  Future<Payroll> byId(String id) async {
    final json = await _api.get('/payrolls/$id') as Map<String, dynamic>;
    return Payroll.fromJson(json);
  }

  /// POST /payrolls.
  Future<Payroll> create({
    required String name,
    required String frequency,
    required List<PayrollItemInput> items,
  }) async {
    final json =
        await _api.post(
              '/payrolls',
              body: {
                'name': name,
                'frequency': frequency,
                'items': items.map((i) => i.toJson()).toList(),
              },
            )
            as Map<String, dynamic>;
    return Payroll.fromJson(json);
  }

  /// PATCH /payrolls/:id. The items array replaces all existing items.
  Future<Payroll> update(
    String id, {
    String? name,
    String? frequency,
    List<PayrollItemInput>? items,
  }) async {
    final json =
        await _api.patch(
              '/payrolls/$id',
              body: {
                'name': ?name,
                'frequency': ?frequency,
                if (items != null)
                  'items': items.map((i) => i.toJson()).toList(),
              },
            )
            as Map<String, dynamic>;
    return Payroll.fromJson(json);
  }

  /// POST /payrolls/:id/fund/prepare: deploys the cycle escrow and
  /// returns the unsigned funding XDR, or null in simulated mode.
  Future<String?> prepareFund(String id) async {
    final json =
        await _api.post('/payrolls/$id/fund/prepare') as Map<String, dynamic>?;
    return json?['unsignedXdr'] as String?;
  }

  /// POST /payrolls/:id/fund/confirm. [txHash] is required in
  /// trustless_work mode and omitted in simulated mode; [firstRun] is an
  /// optional ISO datetime for the first cycle.
  Future<void> confirmFund(
    String id, {
    String? txHash,
    String? firstRun,
  }) async {
    await _api.post(
      '/payrolls/$id/fund/confirm',
      body: {
        if (txHash != null && txHash.isNotEmpty) 'txHash': txHash,
        if (firstRun != null && firstRun.isNotEmpty) 'firstRun': firstRun,
      },
    );
  }

  /// POST /payrolls/:id/execute: runs a cycle now (server-side).
  Future<void> execute(String id) async {
    await _api.post('/payrolls/$id/execute');
  }

  /// POST /payrolls/:id/pause.
  Future<void> pause(String id) async {
    await _api.post('/payrolls/$id/pause');
  }

  /// POST /payrolls/:id/resume.
  Future<void> resume(String id) async {
    await _api.post('/payrolls/$id/resume');
  }

  /// POST /payrolls/:id/archive. Escrow funds return to the company.
  Future<void> archive(String id) async {
    await _api.post('/payrolls/$id/archive');
  }
}
