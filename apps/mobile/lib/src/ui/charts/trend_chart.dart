import 'package:flutter/material.dart';

import '../../core/formatters.dart';
import '../../domain/models/metrics.dart';
import '../theme.dart';
import 'chart_legend.dart';
import 'chart_palette.dart';

/// One line in a [TrendChart]: a label, a color and how to read its value
/// out of a [FundingPoint].
class TrendSeries {
  const TrendSeries({
    required this.label,
    required this.color,
    required this.value,
  });

  final String label;
  final Color color;
  final double Function(FundingPoint) value;
}

/// Multi-series line/area chart over a funding trend (web `TrendChart`
/// parity): each series is a line with a faint fill, sharing one y-axis,
/// with a legend below.
class TrendChart extends StatelessWidget {
  const TrendChart({
    super.key,
    required this.data,
    required this.series,
    this.format = formatCompact,
    this.height = 200,
  });

  final List<FundingPoint> data;
  final List<TrendSeries> series;
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: height,
          width: double.infinity,
          child: CustomPaint(
            painter: _TrendPainter(
              data: data,
              series: series,
              gridColor: palette.grid,
              axisText: colors.textMuted,
              format: format,
            ),
          ),
        ),
        const SizedBox(height: 14),
        ChartLegend(
          entries: [
            for (final s in series)
              LegendEntry(color: s.color, label: s.label),
          ],
        ),
      ],
    );
  }
}

class _TrendPainter extends CustomPainter {
  _TrendPainter({
    required this.data,
    required this.series,
    required this.gridColor,
    required this.axisText,
    required this.format,
  });

  final List<FundingPoint> data;
  final List<TrendSeries> series;
  final Color gridColor;
  final Color axisText;
  final String Function(num) format;

  @override
  void paint(Canvas canvas, Size size) {
    var maxValue = 0.0;
    for (final point in data) {
      for (final s in series) {
        final v = s.value(point);
        if (v > maxValue) maxValue = v;
      }
    }
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
    const ticks = 4;
    for (var i = 0; i <= ticks; i++) {
      final t = i / ticks;
      final y = plot.bottom - t * plot.height;
      canvas.drawLine(Offset(plot.left, y), Offset(plot.right, y), grid);
      _text(canvas, format(top * t), Offset(gutterLeft - 6, y));
    }

    double xAt(int i) => data.length == 1
        ? plot.center.dx
        : plot.left + plot.width * (i / (data.length - 1));

    for (final s in series) {
      Offset pointAt(int i) {
        final y =
            plot.bottom - (top <= 0 ? 0 : (s.value(data[i]) / top) * plot.height);
        return Offset(xAt(i), y);
      }

      final line = Path();
      for (var i = 0; i < data.length; i++) {
        final p = pointAt(i);
        i == 0 ? line.moveTo(p.dx, p.dy) : line.lineTo(p.dx, p.dy);
      }
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
              s.color.withValues(alpha: 0.20),
              s.color.withValues(alpha: 0.01),
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
          ..color = s.color,
      );
    }

    for (var i = 0; i < data.length; i++) {
      _text(
        canvas,
        data[i].label,
        Offset(xAt(i), size.height - gutterBottom + 5),
        hCenter: true,
      );
    }
  }

  void _text(Canvas canvas, String value, Offset at, {bool hCenter = false}) {
    final tp = TextPainter(
      text: TextSpan(
        text: value,
        style: TextStyle(fontSize: 10, color: axisText),
      ),
      textDirection: TextDirection.ltr,
      maxLines: 1,
    )..layout();
    final dx = hCenter ? at.dx - tp.width / 2 : at.dx - tp.width;
    final dy = hCenter ? at.dy : at.dy - tp.height / 2;
    tp.paint(canvas, Offset(dx, dy));
  }

  @override
  bool shouldRepaint(_TrendPainter old) =>
      old.data != data || old.series != series;
}
