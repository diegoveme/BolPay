import 'package:flutter/material.dart';

import '../../core/formatters.dart';
import '../../domain/models/metrics.dart';
import '../theme.dart';
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
    final top = niceMax(maxValue);
    const gutterLeft = 40.0;
    const gutterBottom = 22.0;
    final plot = Rect.fromLTRB(
      gutterLeft,
      6,
      size.width,
      size.height - gutterBottom,
    );

    final grid = Paint()
      ..color = gridColor
      ..strokeWidth = 1;

    // Horizontal gridlines + y-axis tick labels.
    const ticks = 4;
    for (var i = 0; i <= ticks; i++) {
      final t = i / ticks;
      final y = plot.bottom - t * plot.height;
      canvas.drawLine(Offset(plot.left, y), Offset(plot.right, y), grid);
      _text(
        canvas,
        format(top * t),
        Offset(gutterLeft - 6, y),
        axisText,
        align: TextAlign.right,
        anchorRight: true,
        vCenter: true,
      );
    }

    // Bars.
    final slot = plot.width / data.length;
    final barWidth = slot * (1 - barPadding);
    final fill = Paint()..color = barColor;
    for (var i = 0; i < data.length; i++) {
      final value = data[i].value;
      final barHeight = top <= 0 ? 0.0 : (value / top) * plot.height;
      final left = plot.left + slot * i + (slot - barWidth) / 2;
      final rect = Rect.fromLTWH(
        left,
        plot.bottom - barHeight,
        barWidth,
        barHeight,
      );
      canvas.drawRRect(
        RRect.fromRectAndCorners(
          rect,
          topLeft: const Radius.circular(3),
          topRight: const Radius.circular(3),
        ),
        fill,
      );
      _text(
        canvas,
        data[i].label,
        Offset(left + barWidth / 2, size.height - gutterBottom + 5),
        axisText,
        align: TextAlign.center,
        hCenter: true,
        maxWidth: slot,
      );
    }
  }

  void _text(
    Canvas canvas,
    String value,
    Offset at,
    Color color, {
    TextAlign align = TextAlign.left,
    bool anchorRight = false,
    bool hCenter = false,
    bool vCenter = false,
    double? maxWidth,
  }) {
    final tp = TextPainter(
      text: TextSpan(
        text: value,
        style: TextStyle(fontSize: 10, color: color),
      ),
      textAlign: align,
      textDirection: TextDirection.ltr,
      maxLines: 1,
      ellipsis: '…',
    )..layout(maxWidth: maxWidth ?? double.infinity);
    var dx = at.dx;
    if (anchorRight) dx = at.dx - tp.width;
    if (hCenter) dx = at.dx - tp.width / 2;
    final dy = vCenter ? at.dy - tp.height / 2 : at.dy;
    tp.paint(canvas, Offset(dx, dy));
  }

  @override
  bool shouldRepaint(_BarPainter old) =>
      old.data != data || old.barColor != barColor;
}
