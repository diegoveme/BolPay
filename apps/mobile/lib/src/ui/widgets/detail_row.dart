import 'package:flutter/material.dart';

import '../theme.dart';

/// Label/value line item used inside cards (muted label on the left,
/// value on the right). Set [mono] for addresses, hashes and amounts.
class DetailRow extends StatelessWidget {
  const DetailRow({
    super.key,
    required this.label,
    this.value,
    this.child,
    this.mono = false,
  }) : assert(
         value != null || child != null,
         'Provide either a value or a child',
       );

  final String label;
  final String? value;
  final Widget? child;
  final bool mono;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 13, color: colors.textMuted)),
          const SizedBox(width: 16),
          Expanded(
            child: Align(
              alignment: Alignment.centerRight,
              child:
                  child ??
                  Text(
                    value!,
                    textAlign: TextAlign.right,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: colors.text,
                      fontFamily: mono ? 'monospace' : null,
                      fontFeatures: mono
                          ? const [FontFeature.tabularFigures()]
                          : null,
                    ),
                  ),
            ),
          ),
        ],
      ),
    );
  }
}
