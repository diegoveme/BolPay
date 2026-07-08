import '../core/api_client.dart';
import '../domain/models/contract.dart';

/// Input for creating or updating a milestone inside a contract payload.
class MilestoneInput {
  const MilestoneInput({
    required this.title,
    required this.amount,
    this.description,
    this.deadline,
  });

  final String title;
  final String amount;
  final String? description;
  final String? deadline;

  Map<String, dynamic> toJson() => {
    'title': title,
    'amount': amount,
    if (description != null && description!.isNotEmpty)
      'description': description,
    if (deadline != null && deadline!.isNotEmpty) 'deadline': deadline,
  };
}

/// Access to the /contracts endpoints (full lifecycle).
class ContractsRepository {
  ContractsRepository(this._api);

  final ApiClient _api;

  /// GET /contracts with an optional status filter.
  Future<List<Contract>> list({String? status}) async {
    final json = await _api.get(
      '/contracts',
      query: {if (status != null && status.isNotEmpty) 'status': status},
    );
    return (json as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(Contract.fromJson)
        .toList();
  }

  /// GET /contracts/:id.
  Future<Contract> detail(String id) async {
    final json = await _api.get('/contracts/$id') as Map<String, dynamic>;
    return Contract.fromJson(json);
  }

  /// POST /contracts. Exactly one of [freelancerId] or [invitedEmail]
  /// must be provided.
  Future<Contract> create({
    required String title,
    String? description,
    String? deadline,
    required List<MilestoneInput> milestones,
    String? freelancerId,
    String? invitedEmail,
  }) async {
    final descriptionValue = description != null && description.isNotEmpty
        ? description
        : null;
    final deadlineValue = deadline != null && deadline.isNotEmpty
        ? deadline
        : null;
    final freelancerIdValue = freelancerId != null && freelancerId.isNotEmpty
        ? freelancerId
        : null;
    final invitedEmailValue = invitedEmail != null && invitedEmail.isNotEmpty
        ? invitedEmail
        : null;
    final json =
        await _api.post(
              '/contracts',
              body: {
                'title': title,
                'description': ?descriptionValue,
                'deadline': ?deadlineValue,
                'milestones': milestones.map((m) => m.toJson()).toList(),
                'freelancerId': ?freelancerIdValue,
                'invitedEmail': ?invitedEmailValue,
              },
            )
            as Map<String, dynamic>;
    return Contract.fromJson(json);
  }

  /// PATCH /contracts/:id. The milestones array replaces all existing
  /// milestones.
  Future<Contract> update(
    String id, {
    String? title,
    String? description,
    String? deadline,
    List<MilestoneInput>? milestones,
  }) async {
    final json =
        await _api.patch(
              '/contracts/$id',
              body: {
                'title': ?title,
                'description': ?description,
                'deadline': ?deadline,
                if (milestones != null)
                  'milestones': milestones.map((m) => m.toJson()).toList(),
              },
            )
            as Map<String, dynamic>;
    return Contract.fromJson(json);
  }

  /// POST /contracts/:id/send: sends the draft to the freelancer.
  Future<void> send(String id) async {
    await _api.post('/contracts/$id/send');
  }

  /// POST /contracts/:id/accept: accepts and deploys the escrow
  /// server-side.
  Future<void> accept(String id) async {
    await _api.post('/contracts/$id/accept');
  }

  /// POST /contracts/:id/reject with an optional note for the company.
  Future<void> reject(String id, {String? note}) async {
    await _api.post(
      '/contracts/$id/reject',
      body: {if (note != null && note.isNotEmpty) 'note': note},
    );
  }

  /// POST /contracts/:id/request-changes with an optional note.
  Future<void> requestChanges(String id, {String? note}) async {
    await _api.post(
      '/contracts/$id/request-changes',
      body: {if (note != null && note.isNotEmpty) 'note': note},
    );
  }

  /// POST /contracts/:id/escrow/prepare-fund.
  ///
  /// Returns the unsigned XDR to sign, or null in simulated escrow mode
  /// (no signature is required and confirm is called without a txHash).
  Future<String?> prepareFund(String id) async {
    final json =
        await _api.post('/contracts/$id/escrow/prepare-fund')
            as Map<String, dynamic>?;
    return json?['unsignedXdr'] as String?;
  }

  /// POST /contracts/:id/escrow/confirm-fund. [txHash] is required in
  /// trustless_work mode and omitted in simulated mode.
  Future<void> confirmFund(String id, {String? txHash}) async {
    await _api.post(
      '/contracts/$id/escrow/confirm-fund',
      body: {if (txHash != null && txHash.isNotEmpty) 'txHash': txHash},
    );
  }
}
