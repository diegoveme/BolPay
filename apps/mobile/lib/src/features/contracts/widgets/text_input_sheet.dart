import 'package:flutter/material.dart';

import '../../../ui/theme.dart';

/// Bottom-sheet with a single textarea, used for the web note modals:
/// reject / request changes on a contract, request changes on a
/// deliverable and open dispute (with its minimum-length rule).
///
/// Returns the trimmed text when submitted, or null when dismissed.
Future<String?> showTextInputSheet(
  BuildContext context, {
  required String title,
  String? intro,
  required String fieldLabel,
  String? placeholder,
  required String submitLabel,
  bool danger = false,
  int minLength = 0,
}) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _TextInputSheet(
      title: title,
      intro: intro,
      fieldLabel: fieldLabel,
      placeholder: placeholder,
      submitLabel: submitLabel,
      danger: danger,
      minLength: minLength,
    ),
  );
}

class _TextInputSheet extends StatefulWidget {
  const _TextInputSheet({
    required this.title,
    this.intro,
    required this.fieldLabel,
    this.placeholder,
    required this.submitLabel,
    required this.danger,
    required this.minLength,
  });

  final String title;
  final String? intro;
  final String fieldLabel;
  final String? placeholder;
  final String submitLabel;
  final bool danger;
  final int minLength;

  @override
  State<_TextInputSheet> createState() => _TextInputSheetState();
}

class _TextInputSheetState extends State<_TextInputSheet> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final enabled = _controller.text.trim().length >= widget.minLength;
    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            widget.title,
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: colors.text,
            ),
          ),
          if (widget.intro != null) ...[
            const SizedBox(height: 10),
            Text(
              widget.intro!,
              style: TextStyle(fontSize: 13.5, color: colors.textMuted),
            ),
          ],
          const SizedBox(height: 16),
          TextField(
            controller: _controller,
            maxLines: 4,
            autofocus: true,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              labelText: widget.fieldLabel,
              hintText: widget.placeholder,
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: enabled
                ? () => Navigator.of(context).pop(_controller.text.trim())
                : null,
            style: widget.danger
                ? FilledButton.styleFrom(
                    backgroundColor: colors.danger,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: colors.danger.withValues(
                      alpha: 0.55,
                    ),
                  )
                : null,
            child: Text(widget.submitLabel),
          ),
        ],
      ),
    );
  }
}
