import '../core/api_client.dart';
import '../domain/models/dispute.dart';

/// Access to the /disputes endpoints.
class DisputesRepository {
  DisputesRepository(this._api);

  final ApiClient _api;

  /// GET /disputes.
  Future<List<Dispute>> list() async {
    final json = await _api.get('/disputes');
    return (json as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(Dispute.fromJson)
        .toList();
  }

  /// GET /disputes/:id.
  Future<Dispute> byId(String id) async {
    final json = await _api.get('/disputes/$id') as Map<String, dynamic>;
    return Dispute.fromJson(json);
  }

  /// POST /disputes/prepare. Returns the dispute XDR to sign, or null in
  /// simulated mode. [reason] must be 10 to 2000 characters.
  Future<String?> prepare({
    required String milestoneId,
    required String reason,
  }) async {
    final json =
        await _api.post(
              '/disputes/prepare',
              body: {'milestoneId': milestoneId, 'reason': reason},
            )
            as Map<String, dynamic>?;
    return json?['disputeXdr'] as String?;
  }

  /// POST /disputes: opens the dispute after the optional signing step.
  Future<Dispute> open({
    required String milestoneId,
    required String reason,
  }) async {
    final json =
        await _api.post(
              '/disputes',
              body: {'milestoneId': milestoneId, 'reason': reason},
            )
            as Map<String, dynamic>;
    return Dispute.fromJson(json);
  }

  /// POST /disputes/:id/evidence with a file URL, a comment, or both.
  Future<void> addEvidence(
    String id, {
    String? fileUrl,
    String? comment,
  }) async {
    await _api.post(
      '/disputes/$id/evidence',
      body: {
        if (fileUrl != null && fileUrl.isNotEmpty) 'fileUrl': fileUrl,
        if (comment != null && comment.isNotEmpty) 'comment': comment,
      },
    );
  }

  /// POST /disputes/:id/resolve. [outcome] is `release_to_freelancer`,
  /// `refund_to_company` or `split`; for split the two amounts must sum
  /// exactly to the milestone amount.
  Future<void> resolve(
    String id, {
    required String outcome,
    String? resolution,
    String? freelancerAmount,
    String? companyAmount,
  }) async {
    await _api.post(
      '/disputes/$id/resolve',
      body: {
        'outcome': outcome,
        if (resolution != null && resolution.isNotEmpty)
          'resolution': resolution,
        if (freelancerAmount != null && freelancerAmount.isNotEmpty)
          'freelancerAmount': freelancerAmount,
        if (companyAmount != null && companyAmount.isNotEmpty)
          'companyAmount': companyAmount,
      },
    );
  }
}
