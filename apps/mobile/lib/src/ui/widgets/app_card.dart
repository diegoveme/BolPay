import 'package:flutter/material.dart';

import '../theme.dart';

/// Bordered surface card with optional header (title + right-side
/// actions), replicating the web `Card`: 1px hairline border, radius 8,
/// padding 20, no elevation.
class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    this.title,
    this.actions,
    required this.child,
    this.padding = const EdgeInsets.all(20),
  });

  final String? title;
  final List<Widget>? actions;
  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        border: Border.all(color: colors.border),
      ),
      padding: padding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (title != null || (actions?.isNotEmpty ?? false)) ...[
            Row(
              children: [
                if (title != null)
                  Expanded(
                    child: Text(
                      title!,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: colors.text,
                      ),
                    ),
                  )
                else
                  const Spacer(),
                ...?actions,
              ],
            ),
            const SizedBox(height: 14),
          ],
          child,
        ],
      ),
    );
  }
}
