import 'package:flutter/material.dart';

import '../../../data/contracts_repository.dart';
import '../../../ui/theme.dart';
import 'date_field.dart';

/// Editable milestone row state.
class MilestoneDraft {
  MilestoneDraft({
    String title = '',
    String amount = '',
    String description = '',
    this.deadline = '',
  }) : titleController = TextEditingController(text: title),
       amountController = TextEditingController(text: amount),
       descriptionController = TextEditingController(text: description);

  final TextEditingController titleController;
  final TextEditingController amountController;
  final TextEditingController descriptionController;
  String deadline;

  double get amountValue => double.tryParse(amountController.text.trim()) ?? 0;

  bool get isValid =>
      titleController.text.trim().length >= 2 && amountValue > 0;

  MilestoneInput toInput() => MilestoneInput(
    title: titleController.text.trim(),
    amount: amountController.text.trim(),
    description: descriptionController.text.trim(),
    deadline: deadline,
  );

  void dispose() {
    titleController.dispose();
    amountController.dispose();
    descriptionController.dispose();
  }
}

/// One milestone row of the editor: title, amount, deadline, expected
/// deliverables and the remove affordance.
class MilestoneEditor extends StatelessWidget {
  const MilestoneEditor({
    super.key,
    required this.index,
    required this.draft,
    required this.canRemove,
    required this.onChanged,
    required this.onRemove,
    required this.onPickDeadline,
    required this.onClearDeadline,
  });

  final int index;
  final MilestoneDraft draft;
  final bool canRemove;
  final VoidCallback onChanged;
  final VoidCallback onRemove;
  final VoidCallback onPickDeadline;
  final VoidCallback onClearDeadline;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        border: Border.all(color: colors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Milestone ${index + 1}',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: colors.text,
                  ),
                ),
              ),
              if (canRemove)
                TextButton(onPressed: onRemove, child: const Text('Remove')),
            ],
          ),
          const SizedBox(height: 10),
          TextField(
            controller: draft.titleController,
            onChanged: (_) => onChanged(),
            decoration: const InputDecoration(
              labelText: 'Title',
              hintText: 'UI/UX design',
            ),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: draft.amountController,
            onChanged: (_) => onChanged(),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
              labelText: 'Amount (USDC)',
              hintText: '500.00',
            ),
          ),
          const SizedBox(height: 14),
          DateField(
            label: 'Deadline (optional)',
            value: draft.deadline,
            onTap: onPickDeadline,
            onClear: onClearDeadline,
          ),
          const SizedBox(height: 14),
          TextField(
            controller: draft.descriptionController,
            maxLines: 2,
            decoration: const InputDecoration(
              labelText: 'Expected deliverables',
              alignLabelWithHint: true,
            ),
          ),
        ],
      ),
    );
  }
}
