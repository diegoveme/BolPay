import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/app_scope.dart';
import '../../core/formatters.dart';
import '../../data/pollar_client.dart';
import '../../ui/theme.dart';
import '../../ui/widgets/feedback.dart';
import 'auth_card_shell.dart';
import 'widgets/connected_wallet_chip.dart';
import 'widgets/identity_form.dart';
import 'widgets/invitation_banner.dart';
import 'widgets/manual_code_step.dart';
import 'widgets/or_divider.dart';
import 'widgets/pollar_connect_section.dart';
import 'widgets/pollar_step.dart';

/// Sign-in screen (web LoginPage parity, adapted to mobile).
///
/// Two independent paths that end in the same backend exchange:
///  - Custodial (primary when a publishable key is configured): email OTP
///    against the wallet service; the returned custodial wallet address
///    identifies the user and later signs escrow transactions on-device.
///  - Manual (fallback, always available): the user types their email and
///    the Stellar address of their wallet; escrow signatures then happen
///    on the web app.
///
/// Registration is error-driven like the web: the first login attempt is
/// sent with identity only; if the backend answers that the role or email
/// is required, the form expands with the role picker, optional name and
/// invitation code, and the same identity is resubmitted with those
/// extras. A stashed invitation token (from the accept-invite deep link)
/// is always attached and cleared after a successful login.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _addressController = TextEditingController();
  final _nameController = TextEditingController();
  final _inviteController = TextEditingController();
  final _pollarEmailController = TextEditingController();
  final _pollarCodeController = TextEditingController();
  final _manualCodeController = TextEditingController();

  bool _needsRegistration = false;
  bool _submitting = false;
  bool _showManual = false;
  String _role = 'freelancer';
  String? _stashedInvite;

  // Manual (self-declared wallet) path: an emailed code proves the address
  // belongs to the person signing in before the session is created.
  bool _manualCodeSent = false;
  bool _manualCodeVerified = false;
  bool _manualCodeBusy = false;

  PollarStep _pollarStep = PollarStep.none;
  bool _pollarBusy = false;
  String? _pollarSessionId;
  PollarSession? _pollarSession;

  @override
  void initState() {
    super.initState();
    _loadStashedInvite();
  }

  Future<void> _loadStashedInvite() async {
    final token = await AppScope.read(context).storage.readInvitationToken();
    if (!mounted || token == null || token.isEmpty) return;
    setState(() {
      _stashedInvite = token;
      if (_inviteController.text.isEmpty) _inviteController.text = token;
    });
  }

  @override
  void dispose() {
    _emailController.dispose();
    _addressController.dispose();
    _nameController.dispose();
    _inviteController.dispose();
    _pollarEmailController.dispose();
    _pollarCodeController.dispose();
    _manualCodeController.dispose();
    super.dispose();
  }

  String? _validateEmail(String? value) {
    final email = value?.trim() ?? '';
    if (email.isEmpty) return 'Enter your email';
    if (!emailRegExp.hasMatch(email)) return 'Invalid email';
    return null;
  }

  String? _validateStellar(String? value) {
    final address = value?.trim().toUpperCase() ?? '';
    if (address.isEmpty) return 'Enter your Stellar address';
    if (!stellarAddressRegExp.hasMatch(address)) {
      return 'Invalid Stellar address (G... with 56 characters)';
    }
    return null;
  }

  // -----------------------------------------------------------------------
  // Custodial (OTP) connect flow
  // -----------------------------------------------------------------------

  Future<void> _sendPollarCode() async {
    final email = _pollarEmailController.text.trim().toLowerCase();
    if (_validateEmail(email) != null) {
      showErrorSnackBar(context, ApiException(0, 'Enter a valid email.'));
      return;
    }
    setState(() => _pollarBusy = true);
    final pollar = AppScope.read(context).pollar;
    try {
      final sessionId = _pollarSessionId ?? await pollar.createSession();
      await pollar.sendEmailCode(sessionId, email);
      if (!mounted) return;
      setState(() {
        _pollarSessionId = sessionId;
        _pollarStep = PollarStep.code;
        _pollarCodeController.clear();
      });
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    } finally {
      if (mounted) setState(() => _pollarBusy = false);
    }
  }

  Future<void> _verifyPollarCode() async {
    final code = _pollarCodeController.text.trim();
    if (code.isEmpty) return;
    setState(() => _pollarBusy = true);
    final pollar = AppScope.read(context).pollar;
    try {
      final sessionId = _pollarSessionId!;
      await pollar.verifyEmailCode(sessionId, code);
      final session = await pollar.login(
        sessionId,
        deviceLabel: 'BolPay mobile',
      );
      if (!mounted) return;
      setState(() {
        _pollarSession = session;
        _pollarStep = PollarStep.none;
        // Prefill the identity form with what the wallet profile knows.
        if (_emailController.text.isEmpty) {
          _emailController.text =
              session.mail ?? _pollarEmailController.text.trim().toLowerCase();
        }
        final fullName = session.fullName;
        if (_nameController.text.isEmpty && fullName != null) {
          _nameController.text = fullName;
        }
      });
      // Silent exchange like the web: most users go straight in and only
      // first-timers see the registration extras.
      await _submit();
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    } finally {
      if (mounted) setState(() => _pollarBusy = false);
    }
  }

  Future<void> _resetPollar() async {
    final pollar = AppScope.read(context).pollar;
    await pollar.logout();
    if (!mounted) return;
    setState(() {
      _pollarSession = null;
      _pollarSessionId = null;
      _pollarStep = PollarStep.none;
      _needsRegistration = false;
    });
  }

  // -----------------------------------------------------------------------
  // Manual (self-declared wallet) email-code gate
  // -----------------------------------------------------------------------

  /// Manual "Sign in": validates the fields, then requires an emailed code
  /// before the backend exchange. Once the code is verified, subsequent
  /// submits (e.g. the registration re-submit) go straight to [_submit].
  Future<void> _manualSignIn() async {
    if (!_formKey.currentState!.validate()) return;
    if (_manualCodeVerified) {
      await _submit();
      return;
    }
    await _requestManualCode();
  }

  Future<void> _requestManualCode() async {
    setState(() => _manualCodeBusy = true);
    final scope = AppScope.read(context);
    try {
      await scope.auth.requestEmailCode(
        _emailController.text.trim().toLowerCase(),
      );
      if (!mounted) return;
      setState(() {
        _manualCodeSent = true;
        _manualCodeController.clear();
      });
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    } finally {
      if (mounted) setState(() => _manualCodeBusy = false);
    }
  }

  Future<void> _verifyManualCode() async {
    final code = _manualCodeController.text.trim();
    if (code.isEmpty) return;
    setState(() => _manualCodeBusy = true);
    final scope = AppScope.read(context);
    try {
      await scope.auth.verifyEmailCode(
        _emailController.text.trim().toLowerCase(),
        code,
      );
      if (!mounted) return;
      setState(() {
        _manualCodeVerified = true;
        _manualCodeSent = false;
      });
      // Email proven: run the real backend exchange (which may still expand
      // the registration form on a first-time account).
      await _submit();
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    } finally {
      if (mounted) setState(() => _manualCodeBusy = false);
    }
  }

  /// Returns to the identity form to correct the email (drops the sent code).
  void _editManualEmail() {
    setState(() {
      _manualCodeSent = false;
      _manualCodeVerified = false;
    });
  }

  // -----------------------------------------------------------------------
  // Backend exchange (shared by both paths)
  // -----------------------------------------------------------------------

  Future<void> _submit() async {
    final session = _pollarSession;
    // The manual path validates its own fields; the custodial one already
    // holds a verified wallet.
    if (session == null && !_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    final scope = AppScope.read(context);
    try {
      // The invitation field is pre-filled from the stash, but what is sent
      // is exactly what the field holds at submit time. Clearing the field
      // opts out of the invitation (we never silently re-read the stash).
      final invitationInput = _inviteController.text.trim();
      final invitation = invitationInput.isEmpty ? null : invitationInput;
      await scope.auth.login(
        email: _emailController.text.trim().toLowerCase(),
        provider: session?.provider ?? 'email',
        stellarAddress:
            session?.publicKey ?? _addressController.text.trim().toUpperCase(),
        role: _needsRegistration ? _role : null,
        name: _needsRegistration ? _nameController.text.trim() : null,
        invitationToken: invitation,
      );
      // Remember how this session signs escrow actions before the router
      // redirect takes over (AuthState clears the stashed invitation).
      await scope.storage.saveWalletSource(
        session != null ? 'pollar' : 'manual',
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.message.contains('role is required') ||
          e.message.contains('email is required')) {
        // First-time account: expand the registration form and resubmit
        // with role, name and invitation code (web parity).
        setState(() => _needsRegistration = true);
      } else if (_needsRegistration && e.message.contains('already exists')) {
        // Unique-constraint hit while registering: the email belongs to an
        // account bound to another wallet, and rebinding is blocked on
        // purpose (account-takeover protection).
        showErrorSnackBar(
          context,
          ApiException(
            e.statusCode,
            'This email is already registered with a different wallet. '
            'Sign in with that wallet, or use another email here.',
          ),
        );
      } else {
        showErrorSnackBar(context, e);
      }
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _startOver() {
    setState(() {
      _needsRegistration = false;
      _nameController.clear();
      _role = 'freelancer';
    });
  }

  // -----------------------------------------------------------------------
  // Build
  // -----------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final pollarEnabled = AppScope.read(context).pollar.isEnabled;
    final connected = _pollarSession != null;
    // The identity form (email + submit) shows for the manual path or once
    // the custodial wallet is connected and the backend needs extras.
    final showIdentityForm = !pollarEnabled || _showManual || connected;

    return AuthCardShell(
      child: Form(
        key: _formKey,
        autovalidateMode: AutovalidateMode.onUserInteraction,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Freelance contracts, decentralized escrow on Stellar, '
              'and USDC payroll.',
              style: TextStyle(
                fontSize: 13,
                height: 1.5,
                color: colors.textMuted,
              ),
            ),
            const SizedBox(height: 24),
            if (_stashedInvite != null) ...[
              const InvitationBanner(),
              const SizedBox(height: 16),
            ],
            if (pollarEnabled && !connected) ...[
              PollarConnectSection(
                step: _pollarStep,
                busy: _pollarBusy,
                emailController: _pollarEmailController,
                codeController: _pollarCodeController,
                onContinuePressed: () =>
                    setState(() => _pollarStep = PollarStep.email),
                onSendCode: _sendPollarCode,
                onVerifyCode: _verifyPollarCode,
                onUseDifferentEmail: () =>
                    setState(() => _pollarStep = PollarStep.email),
              ),
              const SizedBox(height: 20),
              const OrDivider(),
              const SizedBox(height: 4),
              TextButton(
                onPressed: _pollarBusy
                    ? null
                    : () => setState(() => _showManual = !_showManual),
                child: Text(
                  _showManual
                      ? 'Hide the manual option'
                      : 'I know my wallet address',
                ),
              ),
            ],
            if (connected) ...[
              ConnectedWalletChip(
                address: _pollarSession!.publicKey,
                onReset: _submitting ? null : _resetPollar,
              ),
              const SizedBox(height: 16),
            ],
            if (showIdentityForm)
              // Manual path waiting on the emailed code: swap the identity
              // form for the code step. The custodial path is already
              // verified by its own OTP, so it never shows this.
              if (!connected && _manualCodeSent && !_manualCodeVerified)
                ManualCodeStep(
                  email: _emailController.text.trim().toLowerCase(),
                  busy: _manualCodeBusy,
                  codeController: _manualCodeController,
                  onVerify: _verifyManualCode,
                  onEditEmail: _editManualEmail,
                  onResend: _requestManualCode,
                )
              else
                IdentityForm(
                  connected: connected,
                  needsRegistration: _needsRegistration,
                  role: _role,
                  submitting: _submitting || _manualCodeBusy,
                  emailController: _emailController,
                  addressController: _addressController,
                  nameController: _nameController,
                  inviteController: _inviteController,
                  onRoleChanged: (value) => setState(() => _role = value),
                  // Custodial path already holds a verified wallet; the manual
                  // path must pass the emailed-code gate first.
                  onSubmit: connected ? _submit : _manualSignIn,
                  onStartOver: _startOver,
                  validateEmail: _validateEmail,
                  validateStellar: _validateStellar,
                ),
          ],
        ),
      ),
    );
  }
}
