import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/app_scope.dart';
import '../../core/formatters.dart';
import '../../domain/models/notification_item.dart';
import '../../ui/theme.dart';
import '../../ui/widgets/confirm_sheet.dart';
import '../../ui/widgets/empty_state.dart';
import '../../ui/widgets/error_state.dart';
import '../../ui/widgets/feedback.dart';

/// Notifications inbox (web `NotificationsPage` parity): a card list grouped
/// by event family with a tinted icon, deep-linking to the related contract,
/// dispute or payroll, marking items read on tap, and a per-card delete.
///
/// The web also has an SSE stream; on mobile the list refreshes every
/// 60 seconds instead (the same polling fallback the web bell uses),
/// plus pull-to-refresh.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<NotificationItem>? _items;
  String? _error;
  bool _markingAll = false;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _load();
      _pollTimer = Timer.periodic(
        const Duration(seconds: 60),
        (_) => _silentRefresh(),
      );
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() {
      _items = null;
      _error = null;
    });
    try {
      final items = await AppScope.read(context).notifications.list();
      if (mounted) setState(() => _items = items);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'An unexpected error occurred.');
    }
  }

  /// Background poll: refreshes the list without blanking it.
  Future<void> _silentRefresh() async {
    if (!mounted) return;
    try {
      final items = await AppScope.read(context).notifications.list();
      if (mounted) setState(() => _items = items);
    } catch (_) {
      // Silent: keep the current list while offline.
    }
  }

  Future<void> _markRead(NotificationItem item) async {
    if (item.read) return;
    final repo = AppScope.read(context).notifications;
    setState(() {
      _items = _items!
          .map((n) => n.id == item.id ? n.copyWith(read: true) : n)
          .toList();
    });
    try {
      await repo.markRead(item.id);
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    }
  }

  Future<void> _open(NotificationItem item) async {
    await _markRead(item);
    final link = item.deepLink;
    if (link != null && mounted) context.go(link);
  }

  Future<void> _markAllRead() async {
    final repo = AppScope.read(context).notifications;
    setState(() {
      _markingAll = true;
      _items = _items?.map((n) => n.copyWith(read: true)).toList();
    });
    try {
      await repo.markAllRead();
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    } finally {
      if (mounted) setState(() => _markingAll = false);
    }
  }

  Future<void> _delete(NotificationItem item) async {
    final confirmed = await showConfirmSheet(
      context,
      title: 'Delete notification',
      body: 'This notification will be permanently removed.',
      confirmLabel: 'Delete',
      danger: true,
      dangerNote: 'This action cannot be undone.',
    );
    if (confirmed != true || !mounted) return;
    final repo = AppScope.read(context).notifications;
    final previous = _items;
    setState(() {
      _items = _items?.where((n) => n.id != item.id).toList();
    });
    try {
      await repo.delete(item.id);
    } catch (e) {
      if (mounted) {
        setState(() => _items = previous);
        showErrorSnackBar(context, e);
      }
    }
  }

  bool get _hasUnread => _items?.any((n) => !n.read) ?? false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (_hasUnread)
            TextButton(
              onPressed: _markingAll ? null : _markAllRead,
              child: const Text('Mark all as read'),
            ),
        ],
      ),
      body: switch ((_items, _error)) {
        (null, null) => const Center(child: CircularProgressIndicator()),
        (null, final String error) => ErrorState(
          message: error,
          onRetry: _load,
        ),
        (final List<NotificationItem> items, _) when items.isEmpty =>
          RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: const [
                SizedBox(height: 140),
                EmptyState(
                  icon: Icons.notifications_none,
                  title: 'No notifications',
                ),
              ],
            ),
          ),
        (final List<NotificationItem> items, _) => RefreshIndicator(
          onRefresh: _load,
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final item = items[index];
              return _NotificationCard(
                item: item,
                onTap: item.deepLink != null ? () => _open(item) : null,
                onMarkRead: item.read ? null : () => _markRead(item),
                onDelete: () => _delete(item),
              );
            },
          ),
        ),
      },
    );
  }
}

/// Icon and semantic tone for a notification, grouped by its event family
/// (web `notifStyle` parity).
({IconData icon, Tone tone}) _notifStyle(String type) {
  if (type.startsWith('dispute')) {
    return (icon: Icons.warning_amber_rounded, tone: Tone.danger);
  }
  if (type.startsWith('deliverable')) {
    return (icon: Icons.fact_check_outlined, tone: Tone.warning);
  }
  if (type.startsWith('contract')) {
    return (icon: Icons.description_outlined, tone: Tone.info);
  }
  if (type.startsWith('payroll') ||
      type.startsWith('payment') ||
      type.startsWith('escrow')) {
    return (icon: Icons.payments_outlined, tone: Tone.success);
  }
  return (icon: Icons.notifications_none, tone: Tone.neutral);
}

/// One notification card: tinted icon chip, message (bold when unread),
/// relative time, and trailing mark-read / delete actions. Unread cards
/// carry the subtle primary background like the web.
class _NotificationCard extends StatelessWidget {
  const _NotificationCard({
    required this.item,
    required this.onTap,
    required this.onMarkRead,
    required this.onDelete,
  });

  final NotificationItem item;
  final VoidCallback? onTap;
  final VoidCallback? onMarkRead;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final tones = AppTones.of(context);
    final style = _notifStyle(item.type);
    final unread = !item.read;

    return Material(
      color: unread ? colors.primarySubtle : colors.surface,
      borderRadius: BorderRadius.circular(AppTheme.radiusCard),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTheme.radiusCard),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppTheme.radiusCard),
            border: Border.all(
              color: unread ? colors.primarySubtle : colors.border,
            ),
          ),
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: tones.background(style.tone),
                  borderRadius: BorderRadius.circular(AppTheme.radiusControl),
                ),
                child: Icon(
                  style.icon,
                  size: 18,
                  color: tones.color(style.tone),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.message,
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.4,
                        color: colors.text,
                        fontWeight:
                            unread ? FontWeight.w600 : FontWeight.w400,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      formatDateTime(item.createdAt),
                      style: TextStyle(fontSize: 12, color: colors.textMuted),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 4),
              if (onMarkRead != null)
                _CardAction(
                  icon: Icons.check,
                  tooltip: 'Mark as read',
                  color: colors.textMuted,
                  onPressed: onMarkRead!,
                ),
              _CardAction(
                icon: Icons.delete_outline,
                tooltip: 'Delete',
                color: colors.textMuted,
                hoverColor: colors.danger,
                onPressed: onDelete,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Compact icon button used for the per-card notification actions.
class _CardAction extends StatelessWidget {
  const _CardAction({
    required this.icon,
    required this.tooltip,
    required this.color,
    required this.onPressed,
    this.hoverColor,
  });

  final IconData icon;
  final String tooltip;
  final Color color;
  final Color? hoverColor;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: Icon(icon, size: 18),
      color: color,
      hoverColor: (hoverColor ?? color).withValues(alpha: 0.12),
      tooltip: tooltip,
      visualDensity: VisualDensity.compact,
      constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
      padding: EdgeInsets.zero,
      onPressed: onPressed,
    );
  }
}
