import 'package:flutter/material.dart';

import '../../../ui/widgets/app_card.dart';

/// Theme selector (system / light / dark). The current mode and the change
/// handler are provided by the screen, which persists the choice.
class AppearanceCard extends StatelessWidget {
  const AppearanceCard({
    super.key,
    required this.mode,
    required this.onModeChanged,
  });

  /// Currently selected theme mode.
  final ThemeMode mode;

  final ValueChanged<ThemeMode> onModeChanged;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      title: 'Appearance',
      child: SegmentedButton<ThemeMode>(
        segments: const [
          ButtonSegment(
            value: ThemeMode.system,
            label: Text('System'),
            icon: Icon(Icons.brightness_auto_outlined),
          ),
          ButtonSegment(
            value: ThemeMode.light,
            label: Text('Light'),
            icon: Icon(Icons.light_mode_outlined),
          ),
          ButtonSegment(
            value: ThemeMode.dark,
            label: Text('Dark'),
            icon: Icon(Icons.dark_mode_outlined),
          ),
        ],
        selected: {mode},
        onSelectionChanged: (selection) => onModeChanged(selection.first),
      ),
    );
  }
}
