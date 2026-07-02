import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:bolpay_mobile/src/core/api_client.dart';
import 'package:bolpay_mobile/src/core/app_scope.dart';
import 'package:bolpay_mobile/src/core/theme_controller.dart';
import 'package:bolpay_mobile/src/core/token_storage.dart';
import 'package:bolpay_mobile/src/data/activity_repository.dart';
import 'package:bolpay_mobile/src/data/auth_repository.dart';
import 'package:bolpay_mobile/src/data/contracts_repository.dart';
import 'package:bolpay_mobile/src/data/disputes_repository.dart';
import 'package:bolpay_mobile/src/data/escrow_repository.dart';
import 'package:bolpay_mobile/src/data/milestones_repository.dart';
import 'package:bolpay_mobile/src/data/notifications_repository.dart';
import 'package:bolpay_mobile/src/data/payroll_repository.dart';
import 'package:bolpay_mobile/src/data/pollar_client.dart';
import 'package:bolpay_mobile/src/data/users_repository.dart';
import 'package:bolpay_mobile/src/domain/models/user.dart';
import 'package:bolpay_mobile/src/features/auth/login_screen.dart';
import 'package:bolpay_mobile/src/state/auth_state.dart';
import 'package:bolpay_mobile/src/ui/theme.dart';

/// Fake auth repository: mirrors the backend's error-driven registration.
/// A login without a role fails with "role is required"; with a role it
/// succeeds and returns a freelancer session. The email-code endpoints are
/// stubbed to always succeed (the gate the manual path passes before login).
class _FakeAuthRepository extends AuthRepository {
  _FakeAuthRepository() : super(ApiClient(baseUrl: 'http://unused'));

  @override
  Future<void> requestEmailCode(String email) async {}

  @override
  Future<void> verifyEmailCode(String email, String code) async {}

  @override
  Future<LoginResult> login({
    String? email,
    String provider = 'email',
    required String stellarAddress,
    String? pollarWalletId,
    String? walletAuthXdr,
    String? role,
    String? name,
    String? invitationToken,
  }) async {
    if (role == null || role.isEmpty) {
      throw ApiException(400, 'role is required for first-time registration');
    }
    return LoginResult(
      accessToken: 'test-jwt',
      user: User.fromJson(const {
        'id': 'u1',
        'email': 'freelancer@bolpay.com',
        'role': 'freelancer',
      }),
    );
  }
}

void main() {
  final validAddress = 'G${'A' * 55}';

  Widget buildApp(AuthState auth) {
    final api = ApiClient(baseUrl: 'http://unused');
    final storage = TokenStorage();
    return AppScope(
      auth: auth,
      storage: storage,
      users: UsersRepository(api),
      contracts: ContractsRepository(api),
      milestones: MilestonesRepository(api),
      escrows: EscrowRepository(api),
      payrolls: PayrollRepository(api),
      disputes: DisputesRepository(api),
      notifications: NotificationsRepository(api),
      activity: ActivityRepository(api),
      // Empty publishable key: the custodial login stays hidden and the
      // manual wallet form renders directly, like a dev build.
      pollar: PollarClient(storage: storage, publishableKey: ''),
      theme: ThemeController(),
      child: MaterialApp(theme: AppTheme.light, home: const LoginScreen()),
    );
  }

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    // In-memory secure storage so token reads/writes work under test.
    FlutterSecureStorage.setMockInitialValues({});
  });

  AuthState buildAuth() {
    final storage = TokenStorage();
    return AuthState(
      repository: _FakeAuthRepository(),
      storage: storage,
      pollar: PollarClient(storage: storage, publishableKey: ''),
    );
  }

  testWidgets('login screen renders the main fields', (tester) async {
    await tester.pumpWidget(buildApp(buildAuth()));
    await tester.pump();

    expect(find.text('Sign in with your wallet'), findsOneWidget);
    expect(find.text('Email'), findsOneWidget);
    expect(find.text('Stellar address (your wallet)'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
    // Registration extras stay hidden until the backend asks for them.
    expect(find.text('I want to use BolPay as'), findsNothing);
  });

  testWidgets('validates the Stellar address format (G-address)', (
    tester,
  ) async {
    await tester.pumpWidget(buildApp(buildAuth()));
    await tester.pump();

    await tester.enterText(
      find.byType(TextFormField).at(0),
      'freelancer@bolpay.com',
    );
    await tester.enterText(find.byType(TextFormField).at(1), 'GINVALID');
    await tester.tap(find.text('Sign in'));
    await tester.pump();

    expect(
      find.text('Invalid Stellar address (G... with 56 characters)'),
      findsOneWidget,
    );

    // A valid address clears the format error.
    await tester.enterText(find.byType(TextFormField).at(1), validAddress);
    await tester.pump();
    expect(
      find.text('Invalid Stellar address (G... with 56 characters)'),
      findsNothing,
    );
  });

  testWidgets('registration form expands when the backend requires a role', (
    tester,
  ) async {
    final auth = buildAuth();
    await tester.pumpWidget(buildApp(auth));
    await tester.pump();

    await tester.enterText(
      find.byType(TextFormField).at(0),
      'freelancer@bolpay.com',
    );
    await tester.enterText(find.byType(TextFormField).at(1), validAddress);
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();

    // Manual sign-in first requires the emailed code: the code step appears.
    expect(find.text('Verify and sign in'), findsOneWidget);
    await tester.enterText(find.byType(TextFormField).at(0), '123456');
    await tester.tap(find.text('Verify and sign in'));
    await tester.pumpAndSettle();

    // Code verified: the backend then answered "role is required", so the form
    // expands with the role picker and the button switches to account creation.
    expect(find.text('I want to use BolPay as'), findsOneWidget);
    expect(find.text('Freelancer'), findsOneWidget);
    expect(find.text('Company'), findsOneWidget);
    expect(find.text('Fixed employee'), findsOneWidget);
    expect(find.text('Create account'), findsOneWidget);

    // Resubmitting with the selected role signs the user in. In the app
    // the router redirect takes over; here we assert on the session state.
    await tester.ensureVisible(find.text('Create account'));
    await tester.tap(find.text('Create account'));
    await tester.pumpAndSettle();
    expect(auth.isAuthenticated, isTrue);
    expect(auth.user?.role, 'freelancer');
  });
}
