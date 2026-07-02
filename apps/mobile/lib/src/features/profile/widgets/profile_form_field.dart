import 'package:flutter/material.dart';

import '../../../ui/widgets/button_spinner.dart';

/// Labelled text field with the standard bottom spacing used by the
/// editable profile cards.
class ProfileFormField extends StatelessWidget {
  /// Creates a profile form field bound to [controller].
  const ProfileFormField(
    this.controller, {
    super.key,
    required this.label,
    this.hint,
    this.maxLines = 1,
    this.keyboardType,
  });

  /// Controller backing the underlying text field.
  final TextEditingController controller;

  /// Floating label shown above the field.
  final String label;

  /// Optional placeholder hint.
  final String? hint;

  /// Maximum number of lines the field can grow to.
  final int maxLines;

  /// Optional keyboard type; URL fields also disable autocorrect.
  final TextInputType? keyboardType;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextField(
        controller: controller,
        maxLines: maxLines,
        keyboardType: keyboardType,
        autocorrect: keyboardType != TextInputType.url,
        decoration: InputDecoration(labelText: label, hintText: hint),
      ),
    );
  }
}

/// Filled save button that shows a spinner while [saving] is true.
class ProfileSaveButton extends StatelessWidget {
  /// Creates a save button driven by [saving] and [onSave].
  const ProfileSaveButton({
    super.key,
    required this.saving,
    required this.onSave,
  });

  /// Whether a save request is in flight.
  final bool saving;

  /// Called when the button is tapped and not currently saving.
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: saving ? null : onSave,
      child: saving
          ? const ButtonSpinner(size: 16, color: Colors.white)
          : const Text('Save'),
    );
  }
}
