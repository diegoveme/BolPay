import '../core/api_client.dart';
import '../domain/models/escrow.dart';

/// Access to the /escrows endpoints: USDC trustline management and
/// escrow lookups.
class EscrowRepository {
  EscrowRepository(this._api);

  final ApiClient _api;

  /// GET /escrows/usdc-trustline?address=G...
  Future<TrustlineStatus> trustlineStatus(String address) async {
    final json =
        await _api.get('/escrows/usdc-trustline', query: {'address': address})
            as Map<String, dynamic>;
    return TrustlineStatus.fromJson(json);
  }

  /// POST /escrows/usdc-trustline/prepare. Returns the unsigned XDR that
  /// adds the USDC trustline to [address].
  Future<String?> prepareTrustline(String address) async {
    final json =
        await _api.post(
              '/escrows/usdc-trustline/prepare',
              body: {'address': address},
            )
            as Map<String, dynamic>?;
    return json?['unsignedXdr'] as String?;
  }

  /// GET /escrows (administrator): all escrows with their source refs.
  Future<List<Escrow>> list() async {
    final json = await _api.get('/escrows');
    return (json as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(Escrow.fromJson)
        .toList();
  }

  /// GET /escrows/:id.
  Future<Escrow> byId(String id) async {
    final json = await _api.get('/escrows/$id') as Map<String, dynamic>;
    return Escrow.fromJson(json);
  }
}
