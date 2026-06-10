import 'package:flutter/material.dart';

import '../../core/app_scope.dart';
import '../../data/contracts_repository.dart';
import '../../domain/models/milestone.dart';
import '../../ui/widgets/feedback.dart';

/// Abre el formulario de entregable como bottom sheet.
///
/// Devuelve `true` si el entregable se envió correctamente.
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
      contracts: AppScope.read(context).contracts,
    ),
  );
}

class _DeliverableForm extends StatefulWidget {
  const _DeliverableForm({required this.milestone, required this.contracts});

  final Milestone milestone;
  final ContractsRepository contracts;

  @override
  State<_DeliverableForm> createState() => _DeliverableFormState();
}

class _DeliverableFormState extends State<_DeliverableForm> {
  final _formKey = GlobalKey<FormState>();
  final _linkController = TextEditingController();
  final _noteController = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _linkController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  String? _validateLink(String? value) {
    final link = value?.trim() ?? '';
    if (link.isEmpty) return 'Ingresa el link del entregable';
    final uri = Uri.tryParse(link);
    if (uri == null || !uri.hasScheme || !uri.hasAuthority) {
      return 'Link inválido (incluye https://)';
    }
    return null;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _sending = true);
    try {
      await widget.contracts.submitDeliverable(
        widget.milestone.id,
        linkUrl: _linkController.text.trim(),
        note: _noteController.text.trim(),
      );
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
    final theme = Theme.of(context);
    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Subir entregable',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              widget.milestone.title ?? 'Milestone',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 20),
            TextFormField(
              controller: _linkController,
              keyboardType: TextInputType.url,
              autocorrect: false,
              decoration: const InputDecoration(
                labelText: 'Link del entregable',
                hintText: 'https://…',
                prefixIcon: Icon(Icons.link),
                border: OutlineInputBorder(),
              ),
              validator: _validateLink,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _noteController,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Nota (opcional)',
                prefixIcon: Icon(Icons.notes),
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: _sending ? null : _submit,
              icon: _sending
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.upload_file),
              label: const Text('Enviar entregable'),
            ),
          ],
        ),
      ),
    );
  }
}
