import 'package:flutter/material.dart';

import '../../../domain/models/directory.dart';
import '../../../ui/theme.dart';
import '../../../ui/widgets/async_select_field.dart';

/// Single recipient editor in the payroll form: a fixed-employee
/// selector and the per-cycle USDC amount, with an optional remove
/// action when more than one recipient is present.
class PayrollItemEditor extends StatelessWidget {
  const PayrollItemEditor({
    super.key,
    required this.index,
    required this.recipient,
    required this.amountController,
    required this.canRemove,
    required this.onRemove,
    required this.onSearch,
    required this.onClear,
    required this.onSelected,
    required this.onAmountChanged,
  });

  final int index;
  final EmployeeOption? recipient;
  final TextEditingController amountController;
  final bool canRemove;
  final VoidCallback onRemove;
  final Future<List<AsyncSelectOption<EmployeeOption>>> Function(String query)
  onSearch;
  final VoidCallback onClear;
  final ValueChanged<AsyncSelectOption<EmployeeOption>> onSelected;
  final ValueChanged<String> onAmountChanged;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final recipient = this.recipient;
    final selectedLabel = recipient == null
        ? null
        : recipient.name == null || recipient.name!.isEmpty
        ? (recipient.email.isEmpty ? 'Fixed employee' : recipient.email)
        : (recipient.email.isEmpty
              ? recipient.name!
              : '${recipient.name} (${recipient.email})');
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        border: Border.all(color: colors.border),
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Recipient ${index + 1}',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: colors.text,
                  ),
                ),
              ),
              if (canRemove)
                TextButton(onPressed: onRemove, child: const Text('Remove')),
            ],
          ),
          const SizedBox(height: 10),
          AsyncSelectField<EmployeeOption>(
            label: 'Fixed employee',
            hint: 'Search by name or email',
            selectedLabel: selectedLabel,
            onClear: onClear,
            onSearch: onSearch,
            onSelected: onSelected,
            emptyText: 'No payable employees found',
          ),
          const SizedBox(height: 14),
          TextField(
            controller: amountController,
            onChanged: onAmountChanged,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(labelText: 'Amount (USDC)'),
          ),
        ],
      ),
    );
  }
}
