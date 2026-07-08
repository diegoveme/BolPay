import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:bolpay_mobile/src/ui/theme.dart';
import 'package:bolpay_mobile/src/ui/widgets/status_badge.dart';

void main() {
  group('statusTone / statusLabel', () {
    test('maps contract statuses to labels and tones', () {
      expect(statusLabel(StatusKind.contract, 'draft'), 'Draft');
      expect(statusTone(StatusKind.contract, 'draft'), Tone.neutral);
      expect(
        statusLabel(StatusKind.contract, 'pending_acceptance'),
        'Pending acceptance',
      );
      expect(
        statusTone(StatusKind.contract, 'pending_acceptance'),
        Tone.warning,
      );
      expect(statusTone(StatusKind.contract, 'active'), Tone.info);
      expect(statusTone(StatusKind.contract, 'completed'), Tone.success);
      expect(statusTone(StatusKind.contract, 'rejected'), Tone.danger);
    });

    test('milestone released is shown as "Paid"', () {
      expect(statusLabel(StatusKind.milestone, 'released'), 'Paid');
      expect(statusTone(StatusKind.milestone, 'released'), Tone.success);
      expect(statusTone(StatusKind.milestone, 'disputed'), Tone.danger);
      expect(statusLabel(StatusKind.milestone, 'in_review'), 'In review');
    });

    test('payroll completed is shown as "Archived"', () {
      expect(statusLabel(StatusKind.payroll, 'completed'), 'Archived');
      expect(statusTone(StatusKind.payroll, 'completed'), Tone.neutral);
      expect(statusTone(StatusKind.payroll, 'active'), Tone.success);
    });

    test('deliverable submitted is shown as "Delivered"', () {
      expect(statusLabel(StatusKind.deliverable, 'submitted'), 'Delivered');
      expect(statusTone(StatusKind.deliverable, 'submitted'), Tone.info);
    });

    test('dispute and invitation tones', () {
      expect(statusTone(StatusKind.dispute, 'open'), Tone.danger);
      expect(statusLabel(StatusKind.dispute, 'under_review'), 'Under review');
      expect(statusTone(StatusKind.invitation, 'accepted'), Tone.success);
      expect(statusTone(StatusKind.invitation, 'revoked'), Tone.neutral);
    });
  });

  testWidgets('renders the English label with the semantic tone color', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(body: StatusBadge.contract('active')),
      ),
    );

    expect(find.text('Active'), findsOneWidget);
    final text = tester.widget<Text>(find.text('Active'));
    expect(text.style?.color, AppColors.light.info);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(body: StatusBadge.milestone('released')),
      ),
    );
    expect(find.text('Paid'), findsOneWidget);
    final paid = tester.widget<Text>(find.text('Paid'));
    expect(paid.style?.color, AppColors.light.success);
  });
}
