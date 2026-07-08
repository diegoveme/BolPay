import 'package:flutter/material.dart';

/// Bordered, tappable card that wraps list item [child] content with the
/// standard padding used across the app's entity lists.
class TappableListCard extends StatelessWidget {
  /// Creates a tappable list card invoking [onTap] when pressed.
  const TappableListCard({super.key, required this.onTap, required this.child});

  /// Called when the card is tapped.
  final VoidCallback onTap;

  /// Content laid out inside the padded card body.
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(padding: const EdgeInsets.all(16), child: child),
      ),
    );
  }
}
