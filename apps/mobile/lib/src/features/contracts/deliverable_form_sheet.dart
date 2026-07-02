import 'package:flutter/material.dart';

import '../../core/app_scope.dart';
import '../../core/wallet_signing.dart';
import '../../data/milestones_repository.dart';
import '../../domain/models/milestone.dart';
import '../../ui/theme.dart';
import '../../ui/widgets/feedback.dart';

/// Opens the deliverable form as a bottom sheet (web `DeliverableModal`
/// parity: link, file URL and note; any non-empty field enables submit).
///
/// Returns `true` when the deliverable was submitted successfully.
Future<bool?> showDeliverableFormSheet(
  BuildContext context, {
  required Milestone milestone,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _DeliverableForm(
      milestone: milestone,
      milestones: AppScope.read(context).milestones,
    ),
  );
}

class _DeliverableForm extends StatefulWidget {
  const _DeliverableForm({required this.milestone, required this.milestones});

  final Milestone milestone;
  final MilestonesRepository milestones;

  @override
  State<_DeliverableForm> createState() => _DeliverableFormState();
}

class _DeliverableFormState extends State<_DeliverableForm> {
  final _linkController = TextEditingController();
  final _fileController = TextEditingController();
  final _noteController = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _linkController.dispose();
    _fileController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  bool get _enabled =>
      _linkController.text.trim().isNotEmpty ||
      _fileController.text.trim().isNotEmpty ||
      _noteController.text.trim().isNotEmpty;

  Future<void> _submit() async {
    if (_sending) return;
    setState(() => _sending = true);
    try {
      await widget.milestones.submitDeliverable(
        widget.milestone.id,
        linkUrl: _linkController.text.trim(),
        fileUrl: _fileController.text.trim(),
        note: _noteController.text.trim(),
      );
      // Mark the milestone delivered on-chain. Simulated mode has nothing
      // to sign; a custodial session signs and broadcasts the change-status
      // transaction right here; a manual session is pointed to the web app
      // (the deliverable itself is already saved either way).
      final xdr = await widget.milestones.prepareDeliver(widget.milestone.id);
      if (!mounted) return;
      await resolveSignature(context, xdr);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, e);
        setState(() => _sending = false);
      }
    }
  }

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
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Deliverable · ${widget.milestone.title ?? 'Milestone'}',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: colors.text,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _linkController,
              keyboardType: TextInputType.url,
              autocorrect: false,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                labelText: 'Link (repository, demo, document)',
                hintText: 'https://…',
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _fileController,
              keyboardType: TextInputType.url,
              autocorrect: false,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                labelText: 'File URL (optional)',
                hintText: 'https://storage…/deliverable.zip',
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _noteController,
              maxLines: 3,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                labelText: 'Note',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _enabled && !_sending ? _submit : null,
              child: _sending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Send deliverable'),
            ),
          ],
        ),
      ),
    );
  }
}
