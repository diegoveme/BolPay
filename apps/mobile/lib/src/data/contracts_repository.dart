import '../core/api_client.dart';
import '../domain/models/contract.dart';

/// Acceso a los endpoints de contratos y milestones.
class ContractsRepository {
  ContractsRepository(this._api);

  final ApiClient _api;

  Future<List<Contract>> list() async {
    final json = await _api.get('/contracts');
    return (json as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(Contract.fromJson)
        .toList();
  }

  Future<Contract> detail(String id) async {
    final json = await _api.get('/contracts/$id') as Map<String, dynamic>;
    return Contract.fromJson(json);
  }

  Future<void> accept(String id) async {
    await _api.post('/contracts/$id/accept');
  }

  Future<void> reject(String id, {String? note}) async {
    await _api.post(
      '/contracts/$id/reject',
      body: {if (note != null && note.isNotEmpty) 'note': note},
    );
  }

  Future<void> requestChanges(String id, {String? note}) async {
    await _api.post(
      '/contracts/$id/request-changes',
      body: {if (note != null && note.isNotEmpty) 'note': note},
    );
  }

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
}
