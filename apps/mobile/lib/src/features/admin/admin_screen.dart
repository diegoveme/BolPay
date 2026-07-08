import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/app_scope.dart';
import '../../domain/models/models.dart';
import '../../ui/theme.dart';
import '../../ui/widgets/error_state.dart';
import 'widgets/admin_activity_table.dart';
import 'widgets/admin_escrows_table.dart';
import 'widgets/admin_users_table.dart';

enum _AdminTab { users, escrows, activity }

/// Administration (web `AdminPage` parity): platform supervision with
/// three tabs listing every user, every escrow and the global activity
/// log.
class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  _AdminTab _tab = _AdminTab.users;

  List<User>? _users;
  List<Escrow>? _escrows;
  List<ActivityLog>? _activity;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  /// Loads the current tab's data ([force] re-fetches even when cached).
  Future<void> _load({bool force = false}) async {
    if (!mounted) return;
    final scope = AppScope.read(context);
    setState(() => _error = null);
    try {
      switch (_tab) {
        case _AdminTab.users:
          if (_users == null || force) {
            final users = await scope.users.listUsers();
            if (mounted) setState(() => _users = users);
          }
        case _AdminTab.escrows:
          if (_escrows == null || force) {
            final escrows = await scope.escrows.list();
            if (mounted) setState(() => _escrows = escrows);
          }
        case _AdminTab.activity:
          if (_activity == null || force) {
            final activity = await scope.activity.all();
            if (mounted) setState(() => _activity = activity);
          }
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'An unexpected error occurred.');
    }
  }

  void _selectTab(_AdminTab tab) {
    setState(() {
      _tab = tab;
      _error = null;
    });
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Administration')),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Text(
              'Platform supervision: users, escrows and global activity',
              style: TextStyle(
                fontSize: 14,
                color: AppColors.of(context).textMuted,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: SegmentedButton<_AdminTab>(
              segments: const [
                ButtonSegment(value: _AdminTab.users, label: Text('Users')),
                ButtonSegment(value: _AdminTab.escrows, label: Text('Escrows')),
                ButtonSegment(
                  value: _AdminTab.activity,
                  label: Text('Activity'),
                ),
              ],
              selected: {_tab},
              onSelectionChanged: (selection) => _selectTab(selection.first),
            ),
          ),
          Expanded(child: _body()),
        ],
      ),
    );
  }

  Widget _body() {
    final loaded = switch (_tab) {
      _AdminTab.users => _users != null,
      _AdminTab.escrows => _escrows != null,
      _AdminTab.activity => _activity != null,
    };
    if (_error != null && !loaded) {
      return ErrorState(message: _error!, onRetry: () => _load(force: true));
    }
    if (!loaded) {
      return const Center(child: CircularProgressIndicator());
    }
    return RefreshIndicator(
      onRefresh: () => _load(force: true),
      child: switch (_tab) {
        _AdminTab.users => AdminUsersTable(users: _users!),
        _AdminTab.escrows => AdminEscrowsTable(escrows: _escrows!),
        _AdminTab.activity => AdminActivityTable(activity: _activity!),
      },
    );
  }
}
