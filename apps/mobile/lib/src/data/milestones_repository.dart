import '../core/api_client.dart';
import '../domain/models/milestone.dart';

/// Access to the /milestones endpoints: deliverables, deliver, review
/// and release flows.
///
/// The prepare endpoints return an XDR to sign, or null in simulated
/// escrow mode; in that case the confirm call is made without a txHash.
class MilestonesRepository {
  MilestonesRepository(this._api);

  final ApiClient _api;

  /// GET /milestones/:id.
  Future<Milestone> byId(String id) async {
    final json = await _api.get('/milestones/$id') as Map<String, dynamic>;
    return Milestone.fromJson(json);
  }

  /// POST /milestones/:id/deliverables (freelancer). At least one of the
  /// fields should be non-empty.
  Future<void> submitDeliverable(
    String milestoneId, {
    String? fileUrl,
    String? linkUrl,
    String? note,
  }) async {
    await _api.post(
      '/milestones/$milestoneId/deliverables',
      body: {
        if (fileUrl != null && fileUrl.isNotEmpty) 'fileUrl': fileUrl,
        if (linkUrl != null && linkUrl.isNotEmpty) 'linkUrl': linkUrl,
        if (note != null && note.isNotEmpty) 'note': note,
      },
    );
  }

  /// POST /milestones/:id/deliver/prepare (freelancer). Returns the
  /// deliver XDR or null in simulated mode.
  Future<String?> prepareDeliver(String milestoneId) async {
    final json =
        await _api.post('/milestones/$milestoneId/deliver/prepare')
            as Map<String, dynamic>?;
    return json?['deliverXdr'] as String?;
  }

  /// POST /milestones/:id/approve/prepare (company). Returns the approve
  /// XDR or null in simulated mode.
  Future<String?> prepareApprove(String milestoneId) async {
    final json =
        await _api.post('/milestones/$milestoneId/approve/prepare')
            as Map<String, dynamic>?;
    return json?['approveXdr'] as String?;
  }

  /// POST /milestones/:id/approve/confirm (company). After the company signs
  /// the approval, the PLATFORM executes the release to the freelancer, so no
  /// txHash is sent from the client.
  Future<void> confirmApprove(String milestoneId) async {
    await _api.post('/milestones/$milestoneId/approve/confirm');
  }

  /// POST /milestones/:id/request-changes (company) with review feedback.
  Future<void> requestChanges(String milestoneId, {String? note}) async {
    await _api.post(
      '/milestones/$milestoneId/request-changes',
      body: {if (note != null && note.isNotEmpty) 'note': note},
    );
  }
}
