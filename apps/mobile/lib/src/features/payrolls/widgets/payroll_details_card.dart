import 'package:flutter/material.dart';

import '../../../ui/widgets/app_card.dart';

/// Details card for the payroll form: the payroll name field and the
/// cycle frequency selector.
class PayrollDetailsCard extends StatelessWidget {
  const PayrollDetailsCard({
    super.key,
    required this.nameController,
    required this.frequency,
    required this.onNameChanged,
    required this.onFrequencyChanged,
  });

  final TextEditingController nameController;
  final String frequency;
  final ValueChanged<String> onNameChanged;
  final ValueChanged<String> onFrequencyChanged;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      title: 'Details',
      child: Column(
        children: [
          TextField(
            controller: nameController,
            onChanged: onNameChanged,
            decoration: const InputDecoration(
              labelText: 'Name',
              hintText: 'Core team payroll',
            ),
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            initialValue: frequency,
            decoration: const InputDecoration(labelText: 'Frequency'),
            items: const [
              DropdownMenuItem(value: 'weekly', child: Text('Weekly')),
              DropdownMenuItem(value: 'biweekly', child: Text('Biweekly')),
              DropdownMenuItem(value: 'monthly', child: Text('Monthly')),
            ],
            onChanged: (value) => onFrequencyChanged(value ?? 'monthly'),
          ),
        ],
      ),
    );
  }
}
