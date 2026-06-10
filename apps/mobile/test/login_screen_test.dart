import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:bolpay_mobile/src/features/auth/login_screen.dart';

void main() {
  Widget buildApp() => const MaterialApp(home: LoginScreen());

  testWidgets('La pantalla de login renderiza los campos principales', (
    tester,
  ) async {
    await tester.pumpWidget(buildApp());

    expect(find.text('BolPay'), findsOneWidget);
    expect(find.text('Email'), findsOneWidget);
    expect(find.text('Dirección Stellar (wallet Pollar)'), findsOneWidget);
    expect(find.text('Iniciar sesión'), findsOneWidget);
    expect(find.text('Es mi primer ingreso'), findsOneWidget);
  });

  testWidgets('Valida el formato de la dirección Stellar (G-address)', (
    tester,
  ) async {
    await tester.pumpWidget(buildApp());

    await tester.enterText(
      find.byType(TextFormField).at(0),
      'freelancer@bolpay.com',
    );
    await tester.enterText(find.byType(TextFormField).at(1), 'GINVALIDA');
    await tester.tap(find.text('Iniciar sesión'));
    await tester.pump();

    expect(
      find.text('Dirección Stellar inválida (G… de 56 caracteres)'),
      findsOneWidget,
    );

    // Una dirección válida no muestra el error de formato.
    await tester.enterText(
      find.byType(TextFormField).at(1),
      'G${'A' * 55}',
    );
    await tester.pump();
    expect(
      find.text('Dirección Stellar inválida (G… de 56 caracteres)'),
      findsNothing,
    );
  });

  testWidgets('El selector de rol aparece solo en el primer ingreso', (
    tester,
  ) async {
    await tester.pumpWidget(buildApp());

    expect(find.text('Freelancer'), findsNothing);

    await tester.tap(find.byType(Switch));
    await tester.pumpAndSettle();

    expect(find.text('Freelancer'), findsOneWidget);
    expect(find.text('Empleado fijo'), findsOneWidget);
  });
}
