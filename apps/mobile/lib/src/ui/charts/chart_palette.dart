import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Categorical chart colors and the gridline color, mirroring the web
/// `--chart-1..6` and `--chart-grid` tokens for light and dark themes.
class ChartPalette {
  const ChartPalette({required this.series, required this.grid});

  /// The six-color categorical ramp (blue, gold, green, orange, purple, cyan).
  final List<Color> series;

  /// Hairline gridline color for axes.
  final Color grid;

  /// Color for the series at [index], wrapping around the ramp.
  Color at(int index) => series[index % series.length];

  /// Reads the palette matching the current brightness.
  static ChartPalette of(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark ? _dark : _light;

  static const _light = ChartPalette(
    series: [
      Color(0xFF1466B8),
      Color(0xFFC99A2E),
      Color(0xFF15803D),
      Color(0xFFB45309),
      Color(0xFF7C3AED),
      Color(0xFF0891B2),
    ],
    grid: Color(0xFFE4E8EC),
  );

  static const _dark = ChartPalette(
    series: [
      Color(0xFF4D97E6),
      Color(0xFFD4A73E),
      Color(0xFF3FB96A),
      Color(0xFFE0913A),
      Color(0xFFA78BFA),
      Color(0xFF22B8CF),
    ],
    grid: Color(0xFF2A313C),
  );
}

/// Turns a snake_case enum key into a human label ("in_review" -> "In review").
String humanize(String key) {
  if (key.isEmpty) return key;
  final spaced = key.replaceAll('_', ' ');
  return spaced[0].toUpperCase() + spaced.substring(1);
}

/// Rounds [raw] up to a "nice" axis maximum (1, 2, 5 x 10^n), so gridlines
/// land on round numbers. Mirrors the web `niceTicks` intent.
double niceMax(double raw) {
  if (raw <= 0) return 1;
  final magnitude = math.pow(10, (math.log(raw) / math.ln10).floor()).toDouble();
  final normalized = raw / magnitude;
  final double nice;
  if (normalized <= 1) {
    nice = 1;
  } else if (normalized <= 2) {
    nice = 2;
  } else if (normalized <= 5) {
    nice = 5;
  } else {
    nice = 10;
  }
  return nice * magnitude;
}
