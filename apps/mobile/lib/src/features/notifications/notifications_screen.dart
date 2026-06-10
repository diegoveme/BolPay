import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/app_scope.dart';
import '../../core/formatters.dart';
import '../../domain/models/notification_item.dart';
import '../../ui/widgets/feedback.dart';

/// Lista de notificaciones con marcado de leídas.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<NotificationItem>? _items;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
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
      if (mounted) setState(() => _error = 'Ocurrió un error inesperado.');
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

  Future<void> _markAllRead() async {
    final repo = AppScope.read(context).notifications;
    setState(() {
      _items = _items?.map((n) => n.copyWith(read: true)).toList();
    });
    try {
      await repo.markAllRead();
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasUnread = _items?.any((n) => !n.read) ?? false;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notificaciones'),
        actions: [
          if (hasUnread)
            TextButton(
              onPressed: _markAllRead,
              child: const Text('Marcar todas'),
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
              children: const [
                SizedBox(height: 160),
                EmptyState(
                  icon: Icons.notifications_none,
                  message: 'No tienes notificaciones.',
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
              return _NotificationTile(
                item: item,
                onTap: () => _markRead(item),
              );
            },
          ),
        ),
      },
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.item, required this.onTap});

  final NotificationItem item;
  final VoidCallback onTap;

  IconData get _icon {
    final type = item.type;
    if (type.contains('contract')) return Icons.description_outlined;
    if (type.contains('milestone') || type.contains('deliverable')) {
      return Icons.flag_outlined;
    }
    if (type.contains('payment') || type.contains('release')) {
      return Icons.payments_outlined;
    }
    return Icons.notifications_outlined;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListTile(
      onTap: onTap,
      leading: CircleAvatar(
        backgroundColor: item.read
            ? theme.colorScheme.surfaceContainerHighest
            : theme.colorScheme.primaryContainer,
        child: Icon(
          _icon,
          color: item.read
              ? theme.colorScheme.onSurfaceVariant
              : theme.colorScheme.onPrimaryContainer,
        ),
      ),
      title: Text(
        item.message,
        style: theme.textTheme.bodyMedium?.copyWith(
          fontWeight: item.read ? FontWeight.normal : FontWeight.w600,
        ),
      ),
      subtitle: item.createdAt == null
          ? null
          : Text(formatDateTime(item.createdAt)),
      trailing: item.read
          ? null
          : Icon(Icons.circle, size: 10, color: theme.colorScheme.primary),
    );
  }
}
