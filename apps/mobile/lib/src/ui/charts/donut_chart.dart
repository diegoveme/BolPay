import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../domain/models/metrics.dart';
import '../theme.dart';
import 'chart_legend.dart';
import 'chart_palette.dart';

/// Donut chart of a categorical breakdown (web `DonutChart` parity): a ring
/// of colored segments with the total and a caption in the center, and a
/// legend below mapping each color to its label and count.
class DonutChart extends StatelessWidget {
  const DonutChart({
    super.key,
    required this.data,
    required this.caption,
    this.label,
  });

  final List<CategoryCount> data;

  /// Word shown under the total in the center (e.g. "contracts").
  final String caption;

  /// Maps a raw category key to a display label; defaults to [humanize].
  final String Function(String key)? label;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final palette = ChartPalette.of(context);
    final slices = data.where((d) => d.value > 0).toList();
    final total = slices.fold<double>(0, (sum, d) => sum + d.value);

    if (total <= 0) {
      return SizedBox(
        height: 140,
        child: Center(
          child: Text(
            'No data yet',
            style: TextStyle(fontSize: 13, color: colors.textFaint),
          ),
        ),
      );
    }

    final labelOf = label ?? humanize;
    final entries = <LegendEntry>[
      for (var i = 0; i < slices.length; i++)
        LegendEntry(
          color: palette.at(i),
          label: labelOf(slices[i].key),
          value: slices[i].value.toInt().toString(),
        ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Center(
          child: SizedBox(
            width: 172,
            height: 172,
            child: CustomPaint(
              painter: _DonutPainter(
                slices: slices,
                palette: palette,
                trackColor: palette.grid,
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      total.toInt().toString(),
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w700,
                        color: colors.text,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                    Text(
                      caption,
                      style: TextStyle(fontSize: 12, color: colors.textMuted),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
        ChartLegend(entries: entries),
      ],
    );
  }
}

class _DonutPainter extends CustomPainter {
  _DonutPainter({
    required this.slices,
    required this.palette,
    required this.trackColor,
  });

  final List<CategoryCount> slices;
  final ChartPalette palette;
  final Color trackColor;

  @override
  void paint(Canvas canvas, Size size) {
    final total = slices.fold<double>(0, (sum, d) => sum + d.value);
    if (total <= 0) return;

    const stroke = 22.0;
    final rect = Rect.fromLTWH(
      stroke / 2,
      stroke / 2,
      size.width - stroke,
      size.height - stroke,
    );

    // Background track so a single dominant slice still reads as a ring.
    canvas.drawArc(
      rect,
      0,
      2 * math.pi,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..color = trackColor,
    );

    const gap = 0.03; // small radial gap between segments
    var start = -math.pi / 2;
    for (var i = 0; i < slices.length; i++) {
      final sweep = (slices[i].value / total) * 2 * math.pi;
      if (sweep <= 0) continue;
      final drawSweep = slices.length > 1
          ? math.max(sweep - gap, sweep * 0.5)
          : sweep;
      canvas.drawArc(
        rect,
        start,
        drawSweep,
        false,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = stroke
          ..strokeCap = StrokeCap.butt
          ..color = palette.at(i),
      );
      start += sweep;
    }
  }

  @override
  bool shouldRepaint(_DonutPainter old) =>
      old.slices != slices || old.palette != palette;
}
