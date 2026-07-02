import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/app_scope.dart';
import '../../data/payroll_repository.dart';
import '../../domain/models/models.dart';
import '../../ui/widgets/async_select_field.dart';
import '../../ui/widgets/error_state.dart';
import '../../ui/widgets/feedback.dart';
import '../../ui/widgets/loading_state.dart';
import '../../ui/widgets/section_header.dart';
import 'widgets/payroll_details_card.dart';
import 'widgets/payroll_item_editor.dart';
import 'widgets/payroll_recipients_editor.dart';

/// One recipient line being edited: a payable fixed employee plus the
/// USDC amount per cycle.
class _ItemDraft {
  _ItemDraft();

  EmployeeOption? recipient;
  final TextEditingController amount = TextEditingController();

  void dispose() => amount.dispose();
}

/// Payroll create/edit form (company): name, frequency and the list of
/// fixed-employee recipients with amounts (web parity). When [payrollId]
/// is set the form edits an existing payroll; the items array replaces
/// all existing items on save.
class PayrollFormScreen extends StatefulWidget {
  const PayrollFormScreen({super.key, this.payrollId});

  final String? payrollId;

  @override
  State<PayrollFormScreen> createState() => _PayrollFormScreenState();
}

class _PayrollFormScreenState extends State<PayrollFormScreen> {
  final _name = TextEditingController();
  String _frequency = 'monthly';
  List<_ItemDraft> _items = [_ItemDraft()];

  List<EmployeeOption>? _employees;
  bool _loading = false;
  String? _error;
  bool _saving = false;

  bool get _isEdit => widget.payrollId != null;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _name.dispose();
    for (final item in _items) {
      item.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final scope = AppScope.read(context);
      final employees = await scope.users.employees();
      Payroll? existing;
      if (_isEdit) {
        existing = await scope.payrolls.byId(widget.payrollId!);
      }
      if (!mounted) return;
      setState(() {
        _employees = employees;
        if (existing != null) _prefill(existing, employees);
        _loading = false;
      });
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _error = e.message;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'An unexpected error occurred.';
          _loading = false;
        });
      }
    }
  }

  void _prefill(Payroll payroll, List<EmployeeOption> employees) {
    _name.text = payroll.name;
    _frequency = payroll.frequency;
    for (final item in _items) {
      item.dispose();
    }
    _items = payroll.items.map((item) {
      final draft = _ItemDraft();
      draft.amount.text = item.amount;
      final userId = item.recipientUserId;
      if (userId != null && userId.isNotEmpty) {
        draft.recipient = employees.firstWhere(
          (e) => e.id == userId,
          orElse: () => EmployeeOption(
            id: userId,
            email: item.recipientEmail ?? '',
            name: item.recipientName ?? item.recipientLabel,
            stellarAddress: item.recipientAddress,
          ),
        );
      }
      return draft;
    }).toList();
    if (_items.isEmpty) _items = [_ItemDraft()];
  }

  double get _total {
    var total = 0.0;
    for (final item in _items) {
      total += double.tryParse(item.amount.text) ?? 0;
    }
    return total;
  }

  bool get _valid =>
      _name.text.trim().length >= 3 &&
      _items.isNotEmpty &&
      _items.every(
        (item) =>
            item.recipient != null &&
            (double.tryParse(item.amount.text) ?? 0) > 0,
      );

  Future<List<AsyncSelectOption<EmployeeOption>>> _searchEmployees(
    String query,
  ) async {
    final results = await AppScope.read(context).users.employees(search: query);
    return results
        .where((e) => e.isPayable)
        .map(
          (e) => AsyncSelectOption(
            value: e,
            label: e.name == null || e.name!.isEmpty ? e.email : e.name!,
            sublabel: e.name == null || e.name!.isEmpty ? null : e.email,
          ),
        )
        .toList();
  }

  Future<void> _save() async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      final repo = AppScope.read(context).payrolls;
      final items = _items
          .map(
            (item) => PayrollItemInput(
              amount: item.amount.text.trim(),
              recipientUserId: item.recipient!.id,
            ),
          )
          .toList();
      if (_isEdit) {
        await repo.update(
          widget.payrollId!,
          name: _name.text.trim(),
          frequency: _frequency,
          items: items,
        );
        if (mounted) context.pop(true);
      } else {
        final payroll = await repo.create(
          name: _name.text.trim(),
          frequency: _frequency,
          items: items,
        );
        if (mounted) context.pushReplacement('/payrolls/${payroll.id}');
      }
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final payable = (_employees ?? []).where((e) => e.isPayable).toList();
    return Scaffold(
      appBar: AppBar(title: Text(_isEdit ? 'Edit payroll' : 'New payroll')),
      body: _loading
          ? LoadingState(label: _isEdit ? 'Loading payroll…' : 'Loading…')
          : _error != null
          ? ErrorState(message: _error!, onRetry: _load)
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                SectionHeader(
                  title: _isEdit ? 'Edit payroll' : 'New payroll',
                  subtitle:
                      'Recurring payments to your registered fixed employees',
                ),
                const SizedBox(height: 16),
                PayrollDetailsCard(
                  nameController: _name,
                  frequency: _frequency,
                  onNameChanged: (_) => setState(() {}),
                  onFrequencyChanged: (value) =>
                      setState(() => _frequency = value),
                ),
                const SizedBox(height: 16),
                PayrollRecipientsEditor(
                  total: _total,
                  showEmptyHint: _employees != null && payable.isEmpty,
                  itemCount: _items.length,
                  onAddRecipient: () =>
                      setState(() => _items = [..._items, _ItemDraft()]),
                  itemBuilder: (context, i) => _buildItemEditor(i),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    FilledButton(
                      onPressed: _saving || !_valid ? null : _save,
                      child: Text(_isEdit ? 'Save changes' : 'Create payroll'),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton(
                      onPressed: _saving ? null : () => context.pop(),
                      child: const Text('Cancel'),
                    ),
                  ],
                ),
              ],
            ),
    );
  }

  Widget _buildItemEditor(int index) {
    final item = _items[index];
    return PayrollItemEditor(
      index: index,
      recipient: item.recipient,
      amountController: item.amount,
      canRemove: _items.length > 1,
      onRemove: () => setState(() {
        _items[index].dispose();
        _items = [..._items]..removeAt(index);
      }),
      onSearch: _searchEmployees,
      onClear: () => setState(() => item.recipient = null),
      onSelected: (option) => setState(() => item.recipient = option.value),
      onAmountChanged: (_) => setState(() {}),
    );
  }
}
