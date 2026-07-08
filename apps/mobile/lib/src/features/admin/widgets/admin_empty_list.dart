import 'package:flutter/material.dart';

import '../../../ui/widgets/empty_state.dart';

/// Scrollable empty placeholder for an admin tab, kept scrollable so
/// pull-to-refresh still works when the list has no rows.
class AdminEmptyList extends StatelessWidget {
  const AdminEmptyList({super.key, required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        const SizedBox(height: 100),
        EmptyState(title: title),
      ],
    );
  }
}
