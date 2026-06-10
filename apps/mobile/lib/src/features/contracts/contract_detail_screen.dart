import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/app_scope.dart';
import '../../core/formatters.dart';
import '../../domain/models/contract.dart';
import '../../domain/models/milestone.dart';
import '../../ui/widgets/feedback.dart';
import '../../ui/widgets/status_badge.dart';
import 'deliverable_form_sheet.dart';

/// Detalle de un contrato: estado, escrow, acciones contextuales y
/// timeline de milestones con sus entregables.
class ContractDetailScreen extends StatefulWidget {
  const ContractDetailScreen({super.key, required this.contractId});

  final String contractId;

  @override
  State<ContractDetailScreen> createState() => _ContractDetailScreenState();
}

class _ContractDetailScreenState extends State<ContractDetailScreen> {
  Contract? _contract;
  String? _error;
  bool _actionInProgress = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _contract = null;
      _error = null;
    });
    try {
      final contract = await AppScope.read(
        context,
      ).contracts.detail(widget.contractId);
      if (mounted) setState(() => _contract = contract);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Ocurrió un error inesperado.');
    }
  }

  Future<void> _runAction(
    Future<void> Function() action,
    String successMessage,
  ) async {
    setState(() => _actionInProgress = true);
    try {
      await action();
      if (mounted) showSuccessSnackBar(context, successMessage);
      await _load();
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    } finally {
      if (mounted) setState(() => _actionInProgress = false);
    }
  }

  Future<void> _accept() async {
    final repo = AppScope.read(context).contracts;
    await _runAction(
      () => repo.accept(widget.contractId),
      'Contrato aceptado.',
    );
  }

  Future<void> _rejectOrRequestChanges({required bool reject}) async {
    final note = await _askForNote(
      title: reject ? 'Rechazar contrato' : 'Solicitar cambios',
      hint: reject
          ? 'Motivo del rechazo (opcional)'
          : 'Describe los cambios que necesitas (opcional)',
      confirmLabel: reject ? 'Rechazar' : 'Solicitar',
    );
    if (note == null || !mounted) return;
    final repo = AppScope.read(context).contracts;
    await _runAction(
      () => reject
          ? repo.reject(widget.contractId, note: note)
          : repo.requestChanges(widget.contractId, note: note),
      reject ? 'Contrato rechazado.' : 'Cambios solicitados.',
    );
  }

  /// Devuelve la nota escrita (puede ser vacía) o null si se canceló.
  Future<String?> _askForNote({
    required String title,
    required String hint,
    required String confirmLabel,
  }) {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          maxLines: 3,
          autofocus: true,
          decoration: InputDecoration(
            hintText: hint,
            border: const OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () =>
                Navigator.of(dialogContext).pop(controller.text.trim()),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
  }

  Future<void> _openDeliverableForm(Milestone milestone) async {
    final submitted = await showDeliverableFormSheet(
      context,
      milestone: milestone,
    );
    if (submitted == true && mounted) {
      showSuccessSnackBar(context, 'Entregable enviado.');
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final contract = _contract;
    return Scaffold(
      appBar: AppBar(title: Text(contract?.title ?? 'Contrato')),
      body: switch ((contract, _error)) {
        (null, null) => const Center(child: CircularProgressIndicator()),
        (null, final String error) => ErrorState(
          message: error,
          onRetry: _load,
        ),
        (final Contract c, _) => RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.all(16),
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              _Header(contract: c),
              if (c.reviewNote != null && c.reviewNote!.isNotEmpty) ...[
                const SizedBox(height: 12),
                _ReviewNoteCard(note: c.reviewNote!),
              ],
              if (c.isPendingAcceptance) ...[
                const SizedBox(height: 16),
                _AcceptanceActions(
                  busy: _actionInProgress,
                  onAccept: _accept,
                  onReject: () => _rejectOrRequestChanges(reject: true),
                  onRequestChanges: () =>
                      _rejectOrRequestChanges(reject: false),
                ),
              ],
              const SizedBox(height: 24),
              Text(
                'Milestones',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              if (c.milestones.isEmpty)
                const EmptyState(
                  icon: Icons.flag_outlined,
                  message: 'Este contrato no tiene milestones.',
                )
              else
                for (var i = 0; i < c.milestones.length; i++)
                  _MilestoneTile(
                    milestone: c.milestones[i],
                    index: i,
                    isLast: i == c.milestones.length - 1,
                    canSubmitDeliverable:
                        c.isActive && c.milestones[i].acceptsDeliverables,
                    onSubmitDeliverable: () =>
                        _openDeliverableForm(c.milestones[i]),
                  ),
            ],
          ),
        ),
      },
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.contract});

  final Contract contract;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final escrow = contract.escrow;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    contract.title,
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                StatusBadge.contract(contract.status),
              ],
            ),
            if (contract.description != null &&
                contract.description!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(contract.description!, style: theme.textTheme.bodyMedium),
            ],
            const Divider(height: 24),
            _InfoRow(
              icon: Icons.business_outlined,
              label: 'Empresa',
              value: contract.companyName ?? '—',
            ),
            _InfoRow(
              icon: Icons.attach_money,
              label: 'Monto total',
              value: formatUsdc(contract.totalAmount),
            ),
            if (escrow != null)
              _InfoRow(
                icon: Icons.lock_outline,
                label: 'Escrow',
                value:
                    '${escrow.status}'
                    '${escrow.trustlessWorkId != null ? ' · ${escrow.trustlessWorkId}' : ''}',
              ),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 18, color: theme.colorScheme.onSurfaceVariant),
          const SizedBox(width: 8),
          Text(
            '$label: ',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

class _ReviewNoteCard extends StatelessWidget {
  const _ReviewNoteCard({required this.note});

  final String note;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: EdgeInsets.zero,
      color: theme.colorScheme.tertiaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              Icons.sticky_note_2_outlined,
              color: theme.colorScheme.onTertiaryContainer,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Nota de revisión: $note',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onTertiaryContainer,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AcceptanceActions extends StatelessWidget {
  const _AcceptanceActions({
    required this.busy,
    required this.onAccept,
    required this.onReject,
    required this.onRequestChanges,
  });

  final bool busy;
  final VoidCallback onAccept;
  final VoidCallback onReject;
  final VoidCallback onRequestChanges;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        FilledButton.icon(
          onPressed: busy ? null : onAccept,
          icon: const Icon(Icons.check_circle_outline),
          label: const Text('Aceptar contrato'),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: busy ? null : onRequestChanges,
                icon: const Icon(Icons.edit_note),
                label: const Text('Pedir cambios'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: busy ? null : onReject,
                style: OutlinedButton.styleFrom(
                  foregroundColor: Theme.of(context).colorScheme.error,
                ),
                icon: const Icon(Icons.cancel_outlined),
                label: const Text('Rechazar'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _MilestoneTile extends StatelessWidget {
  const _MilestoneTile({
    required this.milestone,
    required this.index,
    required this.isLast,
    required this.canSubmitDeliverable,
    required this.onSubmitDeliverable,
  });

  final Milestone milestone;
  final int index;
  final bool isLast;
  final bool canSubmitDeliverable;
  final VoidCallback onSubmitDeliverable;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = StatusBadge.colorFor(milestone.status, StatusKind.milestone);
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Línea vertical del timeline.
          SizedBox(
            width: 32,
            child: Column(
              children: [
                Container(
                  width: 26,
                  height: 26,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: color.withValues(alpha: 0.15),
                    border: Border.all(color: color, width: 2),
                  ),
                  child: Text(
                    '${index + 1}',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: color,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: theme.colorScheme.outlineVariant,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            milestone.title ?? 'Milestone ${index + 1}',
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        StatusBadge.milestone(milestone.status),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      formatUsdc(milestone.amount),
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (milestone.deliverables.isNotEmpty) ...[
                      const Divider(height: 16),
                      for (final deliverable in milestone.deliverables)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(
                                Icons.attachment,
                                size: 16,
                                color: theme.colorScheme.onSurfaceVariant,
                              ),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  [
                                    if (deliverable.version != null)
                                      'v${deliverable.version}',
                                    deliverable.linkUrl ??
                                        deliverable.fileUrl ??
                                        deliverable.note ??
                                        'Entregable',
                                  ].join(' · '),
                                  style: theme.textTheme.bodySmall,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                    if (canSubmitDeliverable) ...[
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerRight,
                        child: FilledButton.tonalIcon(
                          onPressed: onSubmitDeliverable,
                          icon: const Icon(Icons.upload_file, size: 18),
                          label: const Text('Subir entregable'),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
