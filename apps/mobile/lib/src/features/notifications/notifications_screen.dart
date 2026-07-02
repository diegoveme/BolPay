import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/app_scope.dart';
import '../../core/formatters.dart';
import '../../domain/models/notification_item.dart';
import '../../ui/theme.dart';
import '../../ui/widgets/empty_state.dart';
import '../../ui/widgets/error_state.dart';
import '../../ui/widgets/feedback.dart';

/// Notifications inbox (web `NotificationsPage` parity): unread rows are
/// emphasized with a dot and bold text, tapping marks the notification
/// read and deep-links to the related contract, dispute or payroll, and
/// "Mark all as read" clears everything.
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

  Future<void> _open(NotificationItem item) async {
    if (!item.read) {
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: (_items == null || _markingAll) ? null : _markAllRead,
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
            itemCount: items.length,
            separatorBuilder: (_, _) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final item = items[index];
              return _NotificationTile(item: item, onTap: () => _open(item));
            },
          ),
        ),
      },
    );
  }
}

/// One notification row: unread dot + message (bold when unread) +
/// relative time; read rows fade to 60% opacity like the web.
class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.item, required this.onTap});

  final NotificationItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return InkWell(
      onTap: onTap,
      child: Opacity(
        opacity: item.read ? 0.6 : 1,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: item.read ? Colors.transparent : colors.primary,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  item.message,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.4,
                    color: colors.text,
                    fontWeight: item.read ? FontWeight.w400 : FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                relativeTime(item.createdAt),
                style: TextStyle(fontSize: 12, color: colors.textMuted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
