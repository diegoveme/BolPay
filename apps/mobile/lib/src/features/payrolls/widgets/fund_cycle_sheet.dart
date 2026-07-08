import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../../../ui/theme.dart';

/// Result of the fund-cycle sheet: an optional first-run date. A null
/// [firstRun] means the schedule is derived from the payroll frequency.
class FundCycleRequest {
  const FundCycleRequest({this.firstRun});

  final DateTime? firstRun;
}

/// Shows the "Fund payroll cycle" sheet (web `FundModal` parity): copy
/// about the escrow, an optional first-run picker and a "Fund and
/// schedule" button. Returns null when dismissed.
Future<FundCycleRequest?> showFundCycleSheet(
  BuildContext context, {
  required String totalLabel,
}) {
  return showModalBottomSheet<FundCycleRequest>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (sheetContext) => _FundCycleSheet(totalLabel: totalLabel),
  );
}

class _FundCycleSheet extends StatefulWidget {
  const _FundCycleSheet({required this.totalLabel});

  final String totalLabel;

  @override
  State<_FundCycleSheet> createState() => _FundCycleSheetState();
}

class _FundCycleSheetState extends State<_FundCycleSheet> {
  DateTime? _firstRun;

  Future<void> _pickFirstRun() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _firstRun ?? now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365 * 2)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: _firstRun != null
          ? TimeOfDay.fromDateTime(_firstRun!)
          : TimeOfDay.now(),
    );
    if (time == null || !mounted) return;
    setState(() {
      _firstRun = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      );
    });
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
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Fund payroll cycle',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: colors.text,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'An escrow for ${widget.totalLabel} is deployed and funded on '
            'Stellar. The distribution runs automatically on the scheduled '
            'date.',
            style: TextStyle(fontSize: 13.5, color: colors.textMuted),
          ),
          const SizedBox(height: 16),
          InkWell(
            onTap: _pickFirstRun,
            borderRadius: BorderRadius.circular(AppTheme.radiusControl),
            child: InputDecorator(
              decoration: InputDecoration(
                labelText: 'First run (optional)',
                helperText:
                    'If left empty, it is scheduled based on the payroll '
                    'frequency',
                helperMaxLines: 2,
                suffixIcon: _firstRun == null
                    ? const Icon(Icons.calendar_today_outlined, size: 18)
                    : IconButton(
                        icon: const Icon(Icons.close, size: 18),
                        onPressed: () => setState(() => _firstRun = null),
                      ),
              ),
              child: Text(
                _firstRun == null
                    ? 'Scheduled by frequency'
                    : formatDateTime(_firstRun!.toIso8601String()),
                style: TextStyle(
                  fontSize: 14,
                  color: _firstRun == null ? colors.textFaint : colors.text,
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: () => Navigator.of(
              context,
            ).pop(FundCycleRequest(firstRun: _firstRun)),
            child: const Text('Fund and schedule'),
          ),
        ],
      ),
    );
  }
}
