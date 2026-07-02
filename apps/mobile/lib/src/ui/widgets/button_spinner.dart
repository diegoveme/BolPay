import 'package:flutter/material.dart';

/// Small circular progress indicator sized for use inside buttons.
class ButtonSpinner extends StatelessWidget {
  /// Creates a button-sized spinner with an optional [size] and [color].
  const ButtonSpinner({super.key, this.size = 20, this.color});

  /// Width and height of the spinner box, in logical pixels.
  final double size;

  /// Optional stroke color; when null the theme default is used.
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: size,
      width: size,
      child: CircularProgressIndicator(strokeWidth: 2, color: color),
    );
  }
}
