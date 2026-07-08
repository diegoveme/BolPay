import 'package:flutter/material.dart';

import '../../core/formatters.dart';
import '../../domain/models/metrics.dart';
import '../theme.dart';
import 'chart_axis.dart';
import 'chart_palette.dart';

/// Vertical bar chart (web `BarChart` parity): value bars over an x-axis of
/// labels, with horizontal gridlines and a formatted y-axis.
class BarChart extends StatelessWidget {
  const BarChart({
    super.key,
    required this.data,
    this.color,
    this.barPadding = 0.3,
    this.format = formatCompact,
    this.height = 200,
  });

  final List<MetricPoint> data;

  /// Bar fill; defaults to the first categorical chart color.
  final Color? color;

  /// Fraction of each slot left empty between bars (0..1).
  final double barPadding;
  final String Function(num) format;
  final double height;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final palette = ChartPalette.of(context);
    if (data.isEmpty) {
      return SizedBox(
        height: height,
        child: Center(
          child: Text(
            'No data yet',
            style: TextStyle(fontSize: 13, color: colors.textFaint),
          ),
        ),
      );
    }
    return SizedBox(
      height: height,
      width: double.infinity,
      child: CustomPaint(
        painter: _BarPainter(
          data: data,
          barColor: color ?? palette.at(0),
          gridColor: palette.grid,
          axisText: colors.textMuted,
          barPadding: barPadding.clamp(0, 0.9),
          format: format,
        ),
      ),
    );
  }
}

class _BarPainter extends CustomPainter {
  _BarPainter({
    required this.data,
    required this.barColor,
    required this.gridColor,
    required this.axisText,
    required this.barPadding,
    required this.format,
  });

  final List<MetricPoint> data;
  final Color barColor;
  final Color gridColor;
  final Color axisText;
  final double barPadding;
  final String Function(num) format;

  @override
  void paint(Canvas canvas, Size size) {
    final maxValue = data.fold<double>(0, (m, d) => d.value > m ? d.value : m);
    final frame = CartesianFrame.forSize(size, maxValue);
    final plot = frame.plot;
    if (plot.width <= 0) return;

    drawGridlines(
      canvas,
      frame,
      gridColor: gridColor,
      labelColor: axisText,
      format: format,
    );

    final slot = plot.width / data.length;
    final barWidth = slot * (1 - barPadding);
    final fill = Paint()..color = barColor;
    for (var i = 0; i < data.length; i++) {
      final barTop = frame.yFor(data[i].value);
      final left = plot.left + slot * i + (slot - barWidth) / 2;
      final rect = Rect.fromLTWH(left, barTop, barWidth, plot.bottom - barTop);
      canvas.drawRRect(
        RRect.fromRectAndCorners(
          rect,
          topLeft: const Radius.circular(3),
          topRight: const Radius.circular(3),
        ),
        fill,
      );
      drawChartText(
        canvas,
        data[i].label,
        Offset(left + barWidth / 2, frame.xLabelTop),
        axisText,
        hCenter: true,
        maxWidth: slot,
      );
    }
  }

  @override
  bool shouldRepaint(_BarPainter old) =>
      old.data != data || old.barColor != barColor;
}
