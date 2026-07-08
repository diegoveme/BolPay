import '../core/api_client.dart';
import '../domain/models/models.dart';

/// Access to the /users endpoints: directory search, invitations,
/// profile updates and avatar upload.
class UsersRepository {
  UsersRepository(this._api);

  final ApiClient _api;

  /// GET /users/freelancers?search= (company, administrator).
  Future<List<FreelancerOption>> freelancers({String? search}) async {
    final json = await _api.get(
      '/users/freelancers',
      query: {if (search != null && search.isNotEmpty) 'search': search},
    );
    return (json as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(FreelancerOption.fromJson)
        .toList();
  }

  /// GET /users/employees?search= (company, administrator).
  Future<List<EmployeeOption>> employees({String? search}) async {
    final json = await _api.get(
      '/users/employees',
      query: {if (search != null && search.isNotEmpty) 'search': search},
    );
    return (json as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(EmployeeOption.fromJson)
        .toList();
  }

  /// GET /users (administrator).
  Future<List<User>> listUsers() async {
    final json = await _api.get('/users');
    return (json as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(User.fromJson)
        .toList();
  }

  /// GET /users/:id (administrator).
  Future<User> userById(String id) async {
    final json = await _api.get('/users/$id') as Map<String, dynamic>;
    return User.fromJson(json);
  }

  /// GET /users/invitations (company, administrator).
  Future<List<Invitation>> invitations() async {
    final json = await _api.get('/users/invitations');
    return (json as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(Invitation.fromJson)
        .toList();
  }

  /// POST /users/invitations. The response includes the invite token.
  Future<Invitation> createInvitation({
    required String email,
    required String role,
  }) async {
    final json =
        await _api.post(
              '/users/invitations',
              body: {'email': email, 'role': role},
            )
            as Map<String, dynamic>;
    return Invitation.fromJson(json);
  }

  /// DELETE /users/invitations/:id.
  Future<void> revokeInvitation(String id) async {
    await _api.delete('/users/invitations/$id');
  }

  /// PATCH /users/me/company-profile. Only non-null fields are sent.
  Future<CompanyProfile> updateCompanyProfile({
    String? name,
    String? description,
    String? location,
    String? website,
    String? industry,
    String? values,
    String? avatarUrl,
  }) async {
    final json =
        await _api.patch(
              '/users/me/company-profile',
              body: {
                'name': ?name,
                'description': ?description,
                'location': ?location,
                'website': ?website,
                'industry': ?industry,
                'values': ?values,
                // Always sent (even null) so clearing it removes the image;
                // a `?avatarUrl` null-aware entry would omit it and keep the old.
                'avatarUrl': avatarUrl,
              },
            )
            as Map<String, dynamic>;
    return CompanyProfile.fromJson(json);
  }

  /// PATCH /users/me/freelancer-profile. Only non-null fields are sent.
  Future<FreelancerProfile> updateFreelancerProfile({
    String? displayName,
    String? headline,
    String? bio,
    List<String>? skills,
    String? location,
    String? website,
    String? linkedin,
    String? github,
    String? avatarUrl,
  }) async {
    final json =
        await _api.patch(
              '/users/me/freelancer-profile',
              body: {
                'displayName': ?displayName,
                'headline': ?headline,
                'bio': ?bio,
                'skills': ?skills,
                'location': ?location,
                'website': ?website,
                'linkedin': ?linkedin,
                'github': ?github,
                // Always sent (even null) so clearing it removes the image;
                // a `?avatarUrl` null-aware entry would omit it and keep the old.
                'avatarUrl': avatarUrl,
              },
            )
            as Map<String, dynamic>;
    return FreelancerProfile.fromJson(json);
  }

  /// Multipart POST /users/me/avatar (field `file`, max 2MB,
  /// png/jpeg/webp/gif). Returns the public URL of the uploaded image.
  Future<String> uploadAvatar({
    required List<int> bytes,
    required String filename,
    required String contentType,
  }) async {
    final json =
        await _api.postMultipart(
              '/users/me/avatar',
              fileField: 'file',
              filename: filename,
              bytes: bytes,
              contentType: contentType,
            )
            as Map<String, dynamic>;
    return (json['url'] ?? '').toString();
  }
}
