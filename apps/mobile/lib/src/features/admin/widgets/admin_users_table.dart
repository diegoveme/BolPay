import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../../../domain/models/user.dart';
import '../../../ui/theme.dart';
import '../../../ui/widgets/status_badge.dart';
import 'admin_empty_list.dart';

/// Users tab table: one row per platform user, or an empty placeholder.
class AdminUsersTable extends StatelessWidget {
  const AdminUsersTable({super.key, required this.users});

  final List<User> users;

  @override
  Widget build(BuildContext context) {
    if (users.isEmpty) return const AdminEmptyList(title: 'No users');
    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      itemCount: users.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, index) => _UserRow(user: users[index]),
    );
  }
}

/// Users tab row: email, name fallback, role, wallet and signup date.
class _UserRow extends StatelessWidget {
  const _UserRow({required this.user});

  final User user;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final name =
        user.name ??
        user.companyProfile?.name ??
        user.freelancerProfile?.displayName ??
        emptyPlaceholder;
    final address = user.stellarAddress;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  user.email,
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
              TonePill(
                label: statusLabel(StatusKind.role, user.role),
                tone: Tone.info,
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 13, color: colors.textMuted),
          ),
          const SizedBox(height: 2),
          Text(
            '${address == null || address.isEmpty ? emptyPlaceholder : shortAddress(address)}'
            ' · signed up ${formatDateTime(user.createdAt)}',
            style: TextStyle(
              fontSize: 12,
              fontFamily: 'monospace',
              color: colors.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}
