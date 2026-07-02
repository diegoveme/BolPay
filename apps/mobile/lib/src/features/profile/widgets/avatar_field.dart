import 'package:flutter/material.dart';

import '../../../ui/theme.dart';
import '../../../ui/widgets/avatar_circle.dart';

/// Avatar editor (web `AvatarField` parity): shows the current image and
/// opens a dialog with a big preview and an image URL input. Cancel
/// discards the change.
///
/// The web also offers a file upload (multipart POST /users/me/avatar);
/// the mobile app supports the URL path and points device uploads to the
/// web app to avoid bundling a file picker.
class AvatarField extends StatelessWidget {
  const AvatarField({
    super.key,
    required this.label,
    required this.value,
    required this.name,
    required this.onChanged,
  });

  /// Dialog title, e.g. "Logo (URL)" or "Photo (URL)".
  final String label;

  /// Current avatar URL (may be empty).
  final String value;

  /// Name used for the initials fallback.
  final String name;

  final ValueChanged<String> onChanged;

  Future<void> _edit(BuildContext context) async {
    final result = await showDialog<String>(
      context: context,
      builder: (dialogContext) =>
          _AvatarDialog(label: label, initialValue: value, name: name),
    );
    if (result != null) onChanged(result);
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        children: [
          InkWell(
            onTap: () => _edit(context),
            customBorder: const CircleBorder(),
            child: AvatarCircle(imageUrl: value, name: name, size: 108),
          ),
          const SizedBox(height: 6),
          Text(
            'Tap the image to change it',
            style: TextStyle(fontSize: 12, color: colors.textMuted),
          ),
        ],
      ),
    );
  }
}

/// Modal editor: big preview + URL field; returns the new URL on Save,
/// null on Cancel (web parity: cancel reverts).
class _AvatarDialog extends StatefulWidget {
  const _AvatarDialog({
    required this.label,
    required this.initialValue,
    required this.name,
  });

  final String label;
  final String initialValue;
  final String name;

  @override
  State<_AvatarDialog> createState() => _AvatarDialogState();
}

class _AvatarDialogState extends State<_AvatarDialog> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialValue)
      ..addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return AlertDialog(
      title: Text(widget.label),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: AvatarCircle(
                imageUrl: _controller.text,
                name: widget.name,
                size: 168,
              ),
            ),
            const SizedBox(height: 18),
            TextField(
              controller: _controller,
              autocorrect: false,
              keyboardType: TextInputType.url,
              decoration: const InputDecoration(
                labelText: 'Image URL',
                hintText: 'https://…',
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Paste an image link (PNG/JPG/WEBP/GIF, max 2MB). '
              'Uploading a file from this device is available on the '
              'BolPay web app.',
              style: TextStyle(fontSize: 12, color: colors.textMuted),
            ),
          ],
        ),
      ),
      actions: [
        OutlinedButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(_controller.text.trim()),
          child: const Text('Save'),
        ),
      ],
    );
  }
}
