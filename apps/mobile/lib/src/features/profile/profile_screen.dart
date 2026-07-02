import 'package:flutter/material.dart';

import '../../core/app_scope.dart';
import '../../domain/models/user.dart';
import '../../ui/theme.dart';
import '../../ui/widgets/confirm_sheet.dart';
import '../../ui/widgets/feedback.dart';
import '../../ui/widgets/section_header.dart';
import '../../ui/widgets/status_badge.dart';
import 'widgets/appearance_card.dart';
import 'widgets/company_form_card.dart';
import 'widgets/freelancer_form_card.dart';
import 'widgets/invitations_card.dart';
import 'widgets/wallet_card.dart';

/// Profile settings (web `ProfilePage` parity): linked Stellar wallet,
/// editable company or freelancer profile, email invitations (company
/// and administrator) and sign out.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  // Company profile fields.
  final _companyName = TextEditingController();
  final _companyLocation = TextEditingController();
  final _companyIndustry = TextEditingController();
  final _companyWebsite = TextEditingController();
  final _companyDescription = TextEditingController();
  final _companyValues = TextEditingController();
  String _companyAvatarUrl = '';

  // Freelancer profile fields.
  final _displayName = TextEditingController();
  final _freelancerLocation = TextEditingController();
  final _headline = TextEditingController();
  final _bio = TextEditingController();
  final _skills = TextEditingController();
  final _freelancerWebsite = TextEditingController();
  final _linkedin = TextEditingController();
  final _github = TextEditingController();
  String _freelancerAvatarUrl = '';

  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _initFromUser(AppScope.read(context).auth.user);
    _skills.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    for (final controller in [
      _companyName,
      _companyLocation,
      _companyIndustry,
      _companyWebsite,
      _companyDescription,
      _companyValues,
      _displayName,
      _freelancerLocation,
      _headline,
      _bio,
      _skills,
      _freelancerWebsite,
      _linkedin,
      _github,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  void _initFromUser(User? user) {
    final cp = user?.companyProfile;
    _companyName.text = cp?.name ?? '';
    _companyLocation.text = cp?.location ?? '';
    _companyIndustry.text = cp?.industry ?? '';
    _companyWebsite.text = cp?.website ?? '';
    _companyDescription.text = cp?.description ?? '';
    _companyValues.text = cp?.values ?? '';
    _companyAvatarUrl = cp?.avatarUrl ?? '';

    final fp = user?.freelancerProfile;
    _displayName.text = fp?.displayName ?? '';
    _freelancerLocation.text = fp?.location ?? '';
    _headline.text = fp?.headline ?? '';
    _bio.text = fp?.bio ?? '';
    _skills.text = fp?.skills.join(', ') ?? '';
    _freelancerWebsite.text = fp?.website ?? '';
    _linkedin.text = fp?.linkedin ?? '';
    _github.text = fp?.github ?? '';
    _freelancerAvatarUrl = fp?.avatarUrl ?? '';
  }

  /// Web parity: empty fields are omitted from the PATCH payload.
  String? _clean(String value) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  List<String> get _skillList => _skills.text
      .split(',')
      .map((s) => s.trim())
      .where((s) => s.isNotEmpty)
      .toList();

  Future<void> _save(String role) async {
    final scope = AppScope.read(context);
    setState(() => _saving = true);
    try {
      if (role == 'company') {
        await scope.users.updateCompanyProfile(
          name: _clean(_companyName.text),
          description: _clean(_companyDescription.text),
          location: _clean(_companyLocation.text),
          website: _clean(_companyWebsite.text),
          industry: _clean(_companyIndustry.text),
          values: _clean(_companyValues.text),
          avatarUrl: _clean(_companyAvatarUrl),
        );
      } else {
        await scope.users.updateFreelancerProfile(
          displayName: _clean(_displayName.text),
          headline: _clean(_headline.text),
          bio: _clean(_bio.text),
          skills: _skillList,
          location: _clean(_freelancerLocation.text),
          website: _clean(_freelancerWebsite.text),
          linkedin: _clean(_linkedin.text),
          github: _clean(_github.text),
          avatarUrl: _clean(_freelancerAvatarUrl),
        );
      }
      if (!mounted) return;
      showSuccessSnackBar(context, 'Profile updated');
      await scope.auth.refreshUser();
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _copyAddress(String address) async {
    await copyToClipboard(context, address, message: 'Address copied');
  }

  Future<void> _confirmLogout() async {
    final confirmed = await showConfirmSheet(
      context,
      title: 'Log out',
      body: 'Are you sure you want to log out?',
      confirmLabel: 'Log out',
    );
    if (confirmed == true && mounted) {
      // logout() is the single full-teardown path: it clears the JWT, the
      // custodial wallet session and the wallet source, and best-effort
      // revokes the server session.
      await AppScope.read(context).auth.logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final auth = AppScope.of(context).auth;
    return ListenableBuilder(
      listenable: auth,
      builder: (context, _) {
        final user = auth.user;
        if (user == null) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        final address = user.stellarAddress;
        final manageInvitations =
            user.role == 'company' || user.role == 'administrator';

        return Scaffold(
          appBar: AppBar(title: const Text('Profile')),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              SectionHeader(
                title: 'Profile',
                subtitle:
                    '${statusLabel(StatusKind.role, user.role)} · '
                    '${user.email}',
                trailing: TonePill(
                  label: user.emailVerified ? 'Verified' : 'Unverified',
                  tone: user.emailVerified ? Tone.success : Tone.warning,
                ),
              ),
              const SizedBox(height: 16),
              WalletCard(
                address: address,
                onCopy: () => _copyAddress(address ?? ''),
              ),
              const SizedBox(height: 20),
              if (user.role == 'company') ...[
                _companyCard(user),
                const SizedBox(height: 20),
              ],
              if (user.role == 'freelancer') ...[
                _freelancerCard(user),
                const SizedBox(height: 20),
              ],
              if (manageInvitations) ...[
                InvitationsCard(isAdministrator: user.isAdministrator),
                const SizedBox(height: 20),
              ],
              _appearanceCard(),
              const SizedBox(height: 20),
              OutlinedButton.icon(
                onPressed: _confirmLogout,
                style: OutlinedButton.styleFrom(
                  foregroundColor: colors.danger,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                icon: const Icon(Icons.logout),
                label: const Text('Log out'),
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  /// Theme selector (system / light / dark), persisted by ThemeController.
  Widget _appearanceCard() {
    final theme = AppScope.read(context).theme;
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: theme,
      builder: (context, mode, _) =>
          AppearanceCard(mode: mode, onModeChanged: theme.setMode),
    );
  }

  Widget _companyCard(User user) {
    return CompanyFormCard(
      nameController: _companyName,
      locationController: _companyLocation,
      industryController: _companyIndustry,
      websiteController: _companyWebsite,
      descriptionController: _companyDescription,
      valuesController: _companyValues,
      avatarUrl: _companyAvatarUrl,
      onAvatarChanged: (v) => setState(() => _companyAvatarUrl = v),
      fallbackName: user.email,
      saving: _saving,
      onSave: () => _save(user.role),
    );
  }

  Widget _freelancerCard(User user) {
    return FreelancerFormCard(
      displayNameController: _displayName,
      locationController: _freelancerLocation,
      headlineController: _headline,
      bioController: _bio,
      skillsController: _skills,
      websiteController: _freelancerWebsite,
      linkedinController: _linkedin,
      githubController: _github,
      avatarUrl: _freelancerAvatarUrl,
      onAvatarChanged: (v) => setState(() => _freelancerAvatarUrl = v),
      fallbackName: user.email,
      skills: _skillList,
      saving: _saving,
      onSave: () => _save(user.role),
    );
  }
}
