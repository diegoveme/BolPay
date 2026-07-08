import 'package:flutter/material.dart';

import 'chart_palette.dart';

/// The plotting frame shared by the cartesian charts (bar, area, trend): the
/// inner plot rect (inside the y-axis gutter and the x-axis label strip) and
/// the "nice" axis maximum. Centralizes the gutter constants and value->pixel
/// mapping so the three painters do not each re-derive them.
class CartesianFrame {
  const CartesianFrame._(this.plot, this.top);

  /// Rect the series are drawn into, excluding the axis label gutters.
  final Rect plot;

  /// Axis maximum, rounded up to a readable value above the data max.
  final double top;

  static const double _gutterLeft = 40;
  static const double _gutterBottom = 22;

  /// Baseline y for the x-axis labels, just below the plot.
  double get xLabelTop => plot.bottom + 5;

  /// Computes the frame for [size], reserving gutters for the axis labels, with
  /// the y-axis rounded up to a nice maximum above [maxValue].
  factory CartesianFrame.forSize(Size size, double maxValue) {
    final plot = Rect.fromLTRB(
      _gutterLeft,
      6,
      size.width,
      size.height - _gutterBottom,
    );
    return CartesianFrame._(plot, niceMax(maxValue));
  }

  /// Y pixel for a data [value] (baseline at [top] == 0, plot top at [top]).
  double yFor(double value) =>
      plot.bottom - (top <= 0 ? 0 : (value / top) * plot.height);
}

/// Draws the horizontal gridlines and the formatted y-axis tick labels.
void drawGridlines(
  Canvas canvas,
  CartesianFrame frame, {
  required Color gridColor,
  required Color labelColor,
  required String Function(num) format,
  int ticks = 4,
}) {
  final grid = Paint()
    ..color = gridColor
    ..strokeWidth = 1;
  for (var i = 0; i <= ticks; i++) {
    final t = i / ticks;
    final y = frame.plot.bottom - t * frame.plot.height;
    canvas.drawLine(
      Offset(frame.plot.left, y),
      Offset(frame.plot.right, y),
      grid,
    );
    drawChartText(
      canvas,
      format(frame.top * t),
      Offset(frame.plot.left - 6, y),
      labelColor,
      anchorRight: true,
      vCenter: true,
    );
  }
}

/// Paints a single-line chart label at [at], anchored per the flags: right-
/// aligned ([anchorRight]) for y-axis ticks, horizontally centered ([hCenter])
/// for x-axis labels, and vertically centered ([vCenter]) on its baseline.
void drawChartText(
  Canvas canvas,
  String value,
  Offset at,
  Color color, {
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
    textDirection: TextDirection.ltr,
    maxLines: 1,
    ellipsis: '…',
  )..layout(maxWidth: maxWidth ?? double.infinity);
  var dx = at.dx;
  if (anchorRight) dx -= tp.width;
  if (hCenter) dx -= tp.width / 2;
  final dy = vCenter ? at.dy - tp.height / 2 : at.dy;
  tp.paint(canvas, Offset(dx, dy));
}
