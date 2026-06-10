import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:bolpay_mobile/src/ui/widgets/status_badge.dart';

void main() {
  group('StatusBadge.colorFor', () {
    test('mapea los estados de contrato a sus colores', () {
      expect(
        StatusBadge.colorFor('pending_acceptance', StatusKind.contract),
        Colors.orange,
      );
      expect(
        StatusBadge.colorFor('active', StatusKind.contract),
        const Color(0xFF1B5FFF),
      );
      expect(
        StatusBadge.colorFor('completed', StatusKind.contract),
        Colors.green,
      );
      expect(StatusBadge.colorFor('rejected', StatusKind.contract), Colors.red);
      expect(
        StatusBadge.colorFor('desconocido', StatusKind.contract),
        Colors.grey,
      );
    });

    test('mapea los estados de milestone a sus colores', () {
      expect(
        StatusBadge.colorFor('pending', StatusKind.milestone),
        Colors.blueGrey,
      );
      expect(
        StatusBadge.colorFor('released', StatusKind.milestone),
        Colors.green,
      );
      expect(
        StatusBadge.colorFor('disputed', StatusKind.milestone),
        Colors.red,
      );
    });
  });

  testWidgets('Renderiza la etiqueta en español con el color del estado', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: StatusBadge.contract('active')),
      ),
    );

    expect(find.text('Activo'), findsOneWidget);

    final text = tester.widget<Text>(find.text('Activo'));
    expect(text.style?.color, const Color(0xFF1B5FFF));

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: StatusBadge.milestone('disputed')),
      ),
    );
    expect(find.text('En disputa'), findsOneWidget);
  });
}
