import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/app_scope.dart';
import '../../core/formatters.dart';
import '../../domain/models/contract.dart';
import '../../ui/theme.dart';
import '../../ui/widgets/app_card.dart';
import '../../ui/widgets/async_select_field.dart';
import '../../ui/widgets/empty_state.dart';
import '../../ui/widgets/error_state.dart';
import '../../ui/widgets/feedback.dart';
import '../../ui/widgets/loading_state.dart';
import 'widgets/date_field.dart';
import 'widgets/freelancer_picker_section.dart';
import 'widgets/milestone_editor.dart';

/// Contract create/edit form (company), web `ContractFormPage` parity:
/// freelancer typeahead with the invite-by-email path, general details
/// and the milestones editor with a running total.
class ContractFormScreen extends StatefulWidget {
  const ContractFormScreen({super.key, this.contractId});

  final String? contractId;

  @override
  State<ContractFormScreen> createState() => _ContractFormScreenState();
}

class _ContractFormScreenState extends State<ContractFormScreen> {
  bool get _isEdit => widget.contractId != null;

  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  String _deadline = '';

  String _freelancerId = '';
  String _freelancerLabel = '';
  String _invitedEmail = '';

  List<MilestoneDraft> _milestones = [MilestoneDraft()];

  bool _loadingExisting = false;
  String? _loadError;
  bool _notEditable = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (_isEdit) {
      _loadingExisting = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => _loadExisting());
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    for (final milestone in _milestones) {
      milestone.dispose();
    }
    super.dispose();
  }

  Future<void> _loadExisting() async {
    setState(() {
      _loadingExisting = true;
      _loadError = null;
    });
    try {
      final contract = await AppScope.read(
        context,
      ).contracts.detail(widget.contractId!);
      if (!mounted) return;
      setState(() {
        _loadingExisting = false;
        _notEditable = !contract.isEditable;
        _prefill(contract);
      });
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _loadingExisting = false;
          _loadError = e.message;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _loadingExisting = false;
          _loadError = 'An unexpected error occurred.';
        });
      }
    }
  }

  void _prefill(Contract contract) {
    _titleController.text = contract.title;
    _descriptionController.text = contract.description ?? '';
    _deadline = _dateOnly(contract.deadline);
    for (final milestone in _milestones) {
      milestone.dispose();
    }
    _milestones = [
      for (final m in contract.milestones)
        MilestoneDraft(
          title: m.title ?? '',
          amount: m.amount,
          description: m.description ?? '',
          deadline: _dateOnly(m.deadline),
        ),
    ];
    if (_milestones.isEmpty) _milestones = [MilestoneDraft()];
  }

  static String _dateOnly(String? iso) =>
      iso == null || iso.length < 10 ? '' : iso.substring(0, 10);

  double get _total => _milestones.fold(0, (sum, m) => sum + m.amountValue);

  bool get _valid =>
      _titleController.text.trim().length >= 3 &&
      (_isEdit || _freelancerId.isNotEmpty || _invitedEmail.isNotEmpty) &&
      _milestones.isNotEmpty &&
      _milestones.every((m) => m.isValid);

  Future<void> _save() async {
    if (_saving) return;
    setState(() => _saving = true);
    final repo = AppScope.read(context).contracts;
    try {
      final Contract contract;
      if (_isEdit) {
        // Empty optional fields are omitted (web sends undefined).
        final description = _descriptionController.text.trim();
        contract = await repo.update(
          widget.contractId!,
          title: _titleController.text.trim(),
          description: description.isEmpty ? null : description,
          deadline: _deadline.isEmpty ? null : _deadline,
          milestones: [for (final m in _milestones) m.toInput()],
        );
      } else {
        contract = await repo.create(
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim(),
          deadline: _deadline,
          milestones: [for (final m in _milestones) m.toInput()],
          freelancerId: _invitedEmail.isEmpty ? _freelancerId : null,
          invitedEmail: _invitedEmail.isEmpty ? null : _invitedEmail,
        );
      }
      if (mounted) context.go('/contracts/${contract.id}');
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, e);
        setState(() => _saving = false);
      }
    }
  }

  Future<void> _pickDate(String current, ValueChanged<String> onPicked) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.tryParse(current) ?? now,
      firstDate: now.subtract(const Duration(days: 1)),
      lastDate: DateTime(now.year + 5),
    );
    if (picked == null) return;
    final month = picked.month.toString().padLeft(2, '0');
    final day = picked.day.toString().padLeft(2, '0');
    onPicked('${picked.year}-$month-$day');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_isEdit ? 'Edit contract' : 'New contract')),
      body: switch ((_loadingExisting, _loadError, _notEditable)) {
        (true, _, _) => const LoadingState(label: 'Loading contract…'),
        (false, final String error, _) => ErrorState(
          message: error,
          onRetry: _loadExisting,
        ),
        (false, null, true) => const Padding(
          padding: EdgeInsets.all(24),
          child: Center(
            child: EmptyState(
              title: 'This contract can no longer be edited',
              hint:
                  'Only drafts and contracts with changes requested can '
                  'be edited.',
            ),
          ),
        ),
        _ => _buildForm(),
      },
    );
  }

  Widget _buildForm() {
    final colors = AppColors.of(context);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          'Define the milestones: each one is paid from escrow once '
          'approved',
          style: TextStyle(fontSize: 14, color: colors.textMuted),
        ),
        const SizedBox(height: 16),
        AppCard(
          title: 'General details',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!_isEdit)
                FreelancerPickerSection(
                  freelancerId: _freelancerId,
                  freelancerLabel: _freelancerLabel,
                  invitedEmail: _invitedEmail,
                  onSearch: (query) async {
                    final options = await AppScope.read(
                      context,
                    ).users.freelancers(search: query);
                    return [
                      for (final option in options)
                        AsyncSelectOption(
                          value: option.userId,
                          label: option.label,
                          sublabel: option.headline,
                        ),
                    ];
                  },
                  onSelected: (option) => setState(() {
                    _freelancerId = option.value;
                    _freelancerLabel = option.label;
                    _invitedEmail = '';
                  }),
                  onEmailInvite: (email) => setState(() {
                    _invitedEmail = email.toLowerCase();
                    _freelancerId = '';
                    _freelancerLabel = '';
                  }),
                  onClear: () => setState(() {
                    _freelancerId = '';
                    _freelancerLabel = '';
                    _invitedEmail = '';
                  }),
                ),
              TextField(
                controller: _titleController,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  labelText: 'Title',
                  hintText: 'Mobile app development',
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _descriptionController,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  hintText: 'Scope, expected deliverables, terms…',
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 14),
              DateField(
                label: 'Due date (optional)',
                value: _deadline,
                onTap: () => _pickDate(
                  _deadline,
                  (value) => setState(() => _deadline = value),
                ),
                onClear: () => setState(() => _deadline = ''),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        AppCard(
          title: 'Milestones · total ${formatUsdc(_total.toStringAsFixed(2))}',
          actions: [
            OutlinedButton(
              onPressed: () =>
                  setState(() => _milestones.add(MilestoneDraft())),
              child: const Text('+ Add milestone'),
            ),
          ],
          child: Column(
            children: [
              for (var i = 0; i < _milestones.length; i++)
                MilestoneEditor(
                  key: ObjectKey(_milestones[i]),
                  index: i,
                  draft: _milestones[i],
                  canRemove: _milestones.length > 1,
                  onChanged: () => setState(() {}),
                  onRemove: () => setState(() {
                    _milestones.removeAt(i).dispose();
                  }),
                  onPickDeadline: () => _pickDate(
                    _milestones[i].deadline,
                    (value) => setState(() => _milestones[i].deadline = value),
                  ),
                  onClearDeadline: () =>
                      setState(() => _milestones[i].deadline = ''),
                ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            FilledButton(
              onPressed: _valid && !_saving ? _save : null,
              child: _saving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(_isEdit ? 'Save changes' : 'Create draft'),
            ),
            const SizedBox(width: 8),
            OutlinedButton(
              onPressed: _saving ? null : () => context.pop(),
              child: const Text('Cancel'),
            ),
          ],
        ),
        const SizedBox(height: 24),
      ],
    );
  }
}
