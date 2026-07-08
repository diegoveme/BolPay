import 'package:flutter/material.dart';

import '../../domain/models/metrics.dart';
import '../theme.dart';
import '../widgets/avatar_circle.dart';

/// Ranked list of freelancers by contract count (web `Leaderboard` parity):
/// a rank chip, avatar, name and contract count per row.
class Leaderboard extends StatelessWidget {
  const Leaderboard({super.key, required this.items});

  final List<TopFreelancer> items;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    if (items.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Text(
          'No freelancers with contracts yet.',
          style: TextStyle(fontSize: 13, color: colors.textFaint),
        ),
      );
    }
    return Column(
      children: [
        for (var i = 0; i < items.length; i++) ...[
          if (i > 0) const SizedBox(height: 12),
          _Row(rank: i + 1, freelancer: items[i]),
        ],
      ],
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.rank, required this.freelancer});

  final int rank;
  final TopFreelancer freelancer;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Row(
      children: [
        Container(
          width: 24,
          height: 24,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: colors.surface2,
            shape: BoxShape.circle,
          ),
          child: Text(
            '$rank',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: colors.textMuted,
            ),
          ),
        ),
        const SizedBox(width: 12),
        AvatarCircle(
          imageUrl: freelancer.avatarUrl,
          name: freelancer.name,
          size: 34,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            freelancer.name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: colors.text,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          '${freelancer.contracts} '
          '${freelancer.contracts == 1 ? 'contract' : 'contracts'}',
          style: TextStyle(fontSize: 13, color: colors.textMuted),
        ),
      ],
    );
  }
}
