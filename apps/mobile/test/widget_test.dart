import 'package:flutter_test/flutter_test.dart';

import 'package:bolpay_mobile/main.dart';

void main() {
  testWidgets('App renders the BolPay home screen', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const BolPayApp());
    await tester.pump();

    expect(find.text('BolPay'), findsWidgets);
  });
}
