import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../../../domain/models/dispute.dart';
import '../../../ui/theme.dart';

/// Resolution chosen in the resolve sheet. For the `split` outcome both
/// amounts are set and sum exactly to the milestone amount.
class ResolveInput {
  const ResolveInput({
    required this.outcome,
    this.resolution,
    this.freelancerAmount,
    this.companyAmount,
  });

  final String outcome;
  final String? resolution;
  final String? freelancerAmount;
  final String? companyAmount;
}

/// Shows the resolve-dispute sheet (web `ResolveModal` parity): outcome
/// selection (release / refund / split with two amounts that must sum to
/// the milestone amount) plus an agreement note. Returns null when
/// dismissed; the caller still confirms before executing.
Future<ResolveInput?> showResolveSheet(
  BuildContext context, {
  required Dispute dispute,
}) {
  return showModalBottomSheet<ResolveInput>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (sheetContext) => _ResolveSheet(dispute: dispute),
  );
}

const _outcomeOptions = [
  ('release_to_freelancer', 'Release everything to the freelancer'),
  ('refund_to_company', 'Refund everything to the company'),
  ('split', 'Split the amount'),
];

class _ResolveSheet extends StatefulWidget {
  const _ResolveSheet({required this.dispute});

  final Dispute dispute;

  @override
  State<_ResolveSheet> createState() => _ResolveSheetState();
}

class _ResolveSheetState extends State<_ResolveSheet> {
  String _outcome = 'release_to_freelancer';
  final _freelancerAmount = TextEditingController();
  final _companyAmount = TextEditingController();
  final _resolution = TextEditingController();

  @override
  void dispose() {
    _freelancerAmount.dispose();
    _companyAmount.dispose();
    _resolution.dispose();
    super.dispose();
  }

  double get _milestoneAmount =>
      double.tryParse(widget.dispute.milestone?.amount ?? '') ?? 0;

  bool get _splitFilled =>
      _freelancerAmount.text.trim().isNotEmpty &&
      _companyAmount.text.trim().isNotEmpty;

  bool get _splitOk {
    if (_outcome != 'split') return true;
    if (!_splitFilled) return false;
    final freelancer = double.tryParse(_freelancerAmount.text.trim());
    final company = double.tryParse(_companyAmount.text.trim());
    if (freelancer == null || company == null) return false;
    if (freelancer < 0 || company < 0) return false;
    return (freelancer + company - _milestoneAmount).abs() < 0.0000001;
  }

  /// The split error only shows once both fields have content, like the
  /// web inline validation.
  bool get _showSplitError => _outcome == 'split' && _splitFilled && !_splitOk;

  void _submit() {
    final isSplit = _outcome == 'split';
    Navigator.of(context).pop(
      ResolveInput(
        outcome: _outcome,
        resolution: _resolution.text.trim().isEmpty
            ? null
            : _resolution.text.trim(),
        freelancerAmount: isSplit ? _freelancerAmount.text.trim() : null,
        companyAmount: isSplit ? _companyAmount.text.trim() : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final amountLabel = formatUsdc(widget.dispute.milestone?.amount);
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
              'Resolve dispute',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: colors.text,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'The split is executed on-chain on the escrow ($amountLabel).',
              style: TextStyle(fontSize: 13.5, color: colors.textMuted),
            ),
            const SizedBox(height: 16),
            Text(
              'Outcome',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: colors.textMuted,
              ),
            ),
            const SizedBox(height: 6),
            for (final (value, label) in _outcomeOptions)
              _OutcomeOption(
                label: label,
                selected: _outcome == value,
                colors: colors,
                onTap: () => setState(() => _outcome = value),
              ),
            if (_outcome == 'split') ...[
              const SizedBox(height: 14),
              TextField(
                controller: _freelancerAmount,
                onChanged: (_) => setState(() {}),
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: const InputDecoration(
                  labelText: 'For the freelancer (USDC)',
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _companyAmount,
                onChanged: (_) => setState(() {}),
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: InputDecoration(
                  labelText: 'For the company (USDC)',
                  errorText: _showSplitError
                      ? 'The total must be '
                            '${formatUsdc(_milestoneAmount.toString())}'
                      : null,
                ),
              ),
            ],
            const SizedBox(height: 14),
            TextField(
              controller: _resolution,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Agreement / justification',
              ),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _splitOk ? _submit : null,
              style: FilledButton.styleFrom(
                backgroundColor: colors.danger,
                foregroundColor: Colors.white,
                disabledBackgroundColor: colors.danger.withValues(alpha: 0.55),
              ),
              child: const Text('Execute resolution'),
            ),
          ],
        ),
      ),
    );
  }
}

class _OutcomeOption extends StatelessWidget {
  const _OutcomeOption({
    required this.label,
    required this.selected,
    required this.colors,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final AppColors colors;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppTheme.radiusControl),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Icon(
              selected
                  ? Icons.radio_button_checked
                  : Icons.radio_button_unchecked,
              size: 20,
              color: selected ? colors.primary : colors.textMuted,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                label,
                style: TextStyle(fontSize: 14, color: colors.text),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
