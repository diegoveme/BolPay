import 'package:flutter/material.dart';

import '../../../ui/theme.dart';
import '../../../ui/widgets/avatar_circle.dart';
import '../../../ui/widgets/feedback.dart';
import '../../../ui/widgets/status_badge.dart';

/// Compact mini-profile for one contract party (web `PartyMini` parity):
/// avatar, name, subtitle (industry/headline plus location), website and
/// up to 8 skill badges for freelancers.
class PartyCard extends StatelessWidget {
  const PartyCard({
    super.key,
    required this.label,
    required this.name,
    this.avatarUrl,
    this.subtitle,
    this.website,
    this.skills = const [],
  });

  final String label;
  final String name;
  final String? avatarUrl;
  final String? subtitle;
  final String? website;
  final List<String> skills;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final safeWebsite = AvatarCircle.isSafeHttpUrl(website) ? website : null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 12, color: colors.textMuted)),
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AvatarCircle(imageUrl: avatarUrl, name: name, size: 48),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: colors.text,
                    ),
                  ),
                  if (subtitle != null && subtitle!.isNotEmpty)
                    Text(
                      subtitle!,
                      style: TextStyle(fontSize: 13, color: colors.textMuted),
                    ),
                  if (safeWebsite != null)
                    InkWell(
                      onTap: () => copyToClipboard(
                        context,
                        safeWebsite,
                        message: 'Link copied to clipboard',
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Text(
                          safeWebsite.replaceFirst(RegExp(r'^https?://'), ''),
                          style: TextStyle(fontSize: 13, color: colors.primary),
                        ),
                      ),
                    ),
                  if (skills.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final skill in skills.take(8))
                          TonePill(label: skill, tone: Tone.neutral),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }
}
