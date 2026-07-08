import 'package:flutter/material.dart';

import '../../core/formatters.dart';
import '../../domain/models/metrics.dart';
import '../theme.dart';
import 'chart_axis.dart';
import 'chart_palette.dart';

/// Single-series area chart (web `AreaChart` parity): a line over a soft
/// vertical gradient fill, with gridlines and a formatted y-axis.
class AreaChart extends StatelessWidget {
  const AreaChart({
    super.key,
    required this.data,
    this.color,
    this.format = formatCompact,
    this.height = 200,
  });

  final List<MetricPoint> data;
  final Color? color;
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
        painter: _AreaPainter(
          data: data,
          lineColor: color ?? palette.at(0),
          gridColor: palette.grid,
          axisText: colors.textMuted,
          format: format,
        ),
      ),
    );
  }
}

class _AreaPainter extends CustomPainter {
  _AreaPainter({
    required this.data,
    required this.lineColor,
    required this.gridColor,
    required this.axisText,
    required this.format,
  });

  final List<MetricPoint> data;
  final Color lineColor;
  final Color gridColor;
  final Color axisText;
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

    Offset pointAt(int i) {
      final x = data.length == 1
          ? plot.center.dx
          : plot.left + plot.width * (i / (data.length - 1));
      return Offset(x, frame.yFor(data[i].value));
    }

    final line = Path();
    for (var i = 0; i < data.length; i++) {
      final p = pointAt(i);
      i == 0 ? line.moveTo(p.dx, p.dy) : line.lineTo(p.dx, p.dy);
    }

    // Gradient fill under the line down to the baseline.
    final fill = Path.from(line)
      ..lineTo(pointAt(data.length - 1).dx, plot.bottom)
      ..lineTo(pointAt(0).dx, plot.bottom)
      ..close();
    canvas.drawPath(
      fill,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            lineColor.withValues(alpha: 0.28),
            lineColor.withValues(alpha: 0.02),
          ],
        ).createShader(plot),
    );

    canvas.drawPath(
      line,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..color = lineColor,
    );

    // X-axis labels.
    for (var i = 0; i < data.length; i++) {
      drawChartText(
        canvas,
        data[i].label,
        Offset(pointAt(i).dx, frame.xLabelTop),
        axisText,
        hCenter: true,
      );
    }
  }

  @override
  bool shouldRepaint(_AreaPainter old) =>
      old.data != data || old.lineColor != lineColor;
}
