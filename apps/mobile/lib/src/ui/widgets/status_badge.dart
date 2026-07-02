import 'package:flutter/material.dart';

import '../theme.dart';

/// Pill badge with a tinted background and a solid semantic text color,
/// replicating the web `Badge`. The label and tone come from the shared
/// status maps in `theme.dart`.
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.status, required this.kind});

  const StatusBadge.contract(String status, {Key? key})
    : this(key: key, status: status, kind: StatusKind.contract);

  const StatusBadge.milestone(String status, {Key? key})
    : this(key: key, status: status, kind: StatusKind.milestone);

  const StatusBadge.dispute(String status, {Key? key})
    : this(key: key, status: status, kind: StatusKind.dispute);

  const StatusBadge.payroll(String status, {Key? key})
    : this(key: key, status: status, kind: StatusKind.payroll);

  const StatusBadge.escrow(String status, {Key? key})
    : this(key: key, status: status, kind: StatusKind.escrow);

  const StatusBadge.invitation(String status, {Key? key})
    : this(key: key, status: status, kind: StatusKind.invitation);

  final String status;
  final StatusKind kind;

  @override
  Widget build(BuildContext context) {
    final tones = AppTones.of(context);
    final tone = statusTone(kind, status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: tones.background(tone),
        borderRadius: BorderRadius.circular(AppTheme.radiusPill),
      ),
      child: Text(
        statusLabel(kind, status),
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: tones.color(tone),
        ),
      ),
    );
  }
}

/// Standalone tone pill for ad hoc labels that are not entity statuses.
class TonePill extends StatelessWidget {
  const TonePill({super.key, required this.label, required this.tone});

  final String label;
  final Tone tone;

  @override
  Widget build(BuildContext context) {
    final tones = AppTones.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: tones.background(tone),
        borderRadius: BorderRadius.circular(AppTheme.radiusPill),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: tones.color(tone),
        ),
      ),
    );
  }
}
