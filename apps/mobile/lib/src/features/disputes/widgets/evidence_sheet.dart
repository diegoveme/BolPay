import 'package:flutter/material.dart';

import '../../../ui/theme.dart';

/// Evidence entered by the user: a URL, a comment, or both.
class EvidenceInput {
  const EvidenceInput({this.fileUrl, this.comment});

  final String? fileUrl;
  final String? comment;
}

/// Shows the add-evidence sheet (web inline evidence form parity):
/// optional evidence URL plus a comment, attached with the "Attach"
/// button once either field is non-empty. Returns null when dismissed.
Future<EvidenceInput?> showEvidenceSheet(BuildContext context) {
  return showModalBottomSheet<EvidenceInput>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (sheetContext) => const _EvidenceSheet(),
  );
}

class _EvidenceSheet extends StatefulWidget {
  const _EvidenceSheet();

  @override
  State<_EvidenceSheet> createState() => _EvidenceSheetState();
}

class _EvidenceSheetState extends State<_EvidenceSheet> {
  final _fileUrl = TextEditingController();
  final _comment = TextEditingController();

  @override
  void dispose() {
    _fileUrl.dispose();
    _comment.dispose();
    super.dispose();
  }

  bool get _canAttach =>
      _fileUrl.text.trim().isNotEmpty || _comment.text.trim().isNotEmpty;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
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
            'Attach evidence',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: colors.text,
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _fileUrl,
            onChanged: (_) => setState(() {}),
            autocorrect: false,
            keyboardType: TextInputType.url,
            decoration: const InputDecoration(
              labelText: 'Evidence URL (optional)',
              hintText: 'https://…',
            ),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _comment,
            onChanged: (_) => setState(() {}),
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Comment'),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _canAttach
                ? () => Navigator.of(context).pop(
                    EvidenceInput(
                      fileUrl: _fileUrl.text.trim().isEmpty
                          ? null
                          : _fileUrl.text.trim(),
                      comment: _comment.text.trim().isEmpty
                          ? null
                          : _comment.text.trim(),
                    ),
                  )
                : null,
            child: const Text('Attach'),
          ),
        ],
      ),
    );
  }
}
