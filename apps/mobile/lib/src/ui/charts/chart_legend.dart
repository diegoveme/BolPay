import 'package:flutter/material.dart';

import '../theme.dart';

/// One entry in a chart legend: a color swatch, a label and an optional
/// trailing value (e.g. the slice count or series total).
class LegendEntry {
  const LegendEntry({required this.color, required this.label, this.value});

  final Color color;
  final String label;
  final String? value;
}

/// Wrapping legend rendered below a chart. Each entry shows a rounded color
/// swatch, its label and (when present) a muted trailing value.
class ChartLegend extends StatelessWidget {
  const ChartLegend({super.key, required this.entries});

  final List<LegendEntry> entries;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Wrap(
      spacing: 16,
      runSpacing: 8,
      children: [
        for (final entry in entries)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: entry.color,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              const SizedBox(width: 6),
              Text(
                entry.label,
                style: TextStyle(fontSize: 12, color: colors.textMuted),
              ),
              if (entry.value != null) ...[
                const SizedBox(width: 6),
                Text(
                  entry.value!,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: colors.text,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ],
          ),
      ],
    );
  }
}
