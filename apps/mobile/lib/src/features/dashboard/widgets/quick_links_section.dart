import 'package:flutter/material.dart';

import '../../../ui/theme.dart';

/// Quick-link cards to the main sections, filtered by role. Renders
/// nothing when the current role has no shortcuts. Navigation is delegated
/// to [onOpen] with the target route so it stays in the screen.
class QuickLinksSection extends StatelessWidget {
  const QuickLinksSection({
    super.key,
    required this.role,
    required this.onOpen,
  });

  final String? role;
  final ValueChanged<String> onOpen;

  @override
  Widget build(BuildContext context) {
    final managesContracts = role != 'fixed_employee';
    final managesPayroll = role == 'company' || role == 'administrator';
    final links = <(String, IconData, String)>[
      if (managesContracts)
        ('Contracts', Icons.description_outlined, '/contracts'),
      if (managesPayroll) ('Payroll', Icons.payments_outlined, '/payrolls'),
      if (managesContracts) ('Disputes', Icons.gavel_outlined, '/disputes'),
    ];
    if (links.isEmpty) return const SizedBox.shrink();
    return Column(
      children: [
        Row(
          children: [
            for (final (index, link) in links.indexed) ...[
              if (index > 0) const SizedBox(width: 12),
              Expanded(
                child: _QuickLinkCard(
                  label: link.$1,
                  icon: link.$2,
                  onTap: () => onOpen(link.$3),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 20),
      ],
    );
  }
}

/// Tappable shortcut card used in the quick-links row.
class _QuickLinkCard extends StatelessWidget {
  const _QuickLinkCard({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Material(
      color: colors.surface,
      borderRadius: BorderRadius.circular(AppTheme.radiusCard),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppTheme.radiusCard),
            border: Border.all(color: colors.border),
          ),
          child: Column(
            children: [
              Icon(icon, size: 22, color: colors.primary),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: colors.text,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
