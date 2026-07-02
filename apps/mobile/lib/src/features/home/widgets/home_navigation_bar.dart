import 'package:flutter/material.dart';

/// Metadata for one bottom-navigation destination, tied to a router
/// shell branch index.
class _NavItem {
  const _NavItem({
    required this.branchIndex,
    required this.label,
    required this.icon,
    required this.selectedIcon,
  });

  final int branchIndex;
  final String label;
  final IconData icon;
  final IconData selectedIcon;
}

const _dashboard = _NavItem(
  branchIndex: 0,
  label: 'Dashboard',
  icon: Icons.space_dashboard_outlined,
  selectedIcon: Icons.space_dashboard,
);
const _contracts = _NavItem(
  branchIndex: 1,
  label: 'Contracts',
  icon: Icons.description_outlined,
  selectedIcon: Icons.description,
);
const _payrolls = _NavItem(
  branchIndex: 2,
  label: 'Payroll',
  icon: Icons.payments_outlined,
  selectedIcon: Icons.payments,
);
const _disputes = _NavItem(
  branchIndex: 3,
  label: 'Disputes',
  icon: Icons.gavel_outlined,
  selectedIcon: Icons.gavel,
);
const _admin = _NavItem(
  branchIndex: 4,
  label: 'Admin',
  icon: Icons.admin_panel_settings_outlined,
  selectedIcon: Icons.admin_panel_settings,
);
const _notifications = _NavItem(
  branchIndex: 5,
  label: 'Notifications',
  icon: Icons.notifications_outlined,
  selectedIcon: Icons.notifications,
);
const _profile = _NavItem(
  branchIndex: 6,
  label: 'Profile',
  icon: Icons.person_outline,
  selectedIcon: Icons.person,
);

/// Bottom-navigation destinations by role (web NAV_BY_ROLE parity,
/// trimmed to fit a mobile navigation bar; disputes stay reachable by
/// route for company and administrator).
List<_NavItem> _itemsForRole(String? role) {
  return switch (role) {
    'company' => const [
      _dashboard,
      _contracts,
      _payrolls,
      _notifications,
      _profile,
    ],
    'freelancer' => const [
      _dashboard,
      _contracts,
      _disputes,
      _notifications,
      _profile,
    ],
    'fixed_employee' => const [_dashboard, _notifications, _profile],
    'administrator' => const [
      _dashboard,
      _contracts,
      _payrolls,
      _admin,
      _notifications,
      _profile,
    ],
    _ => const [_dashboard, _contracts, _notifications, _profile],
  };
}

/// Role-aware bottom navigation bar with an unread notifications badge.
/// Branch selection is delegated to [onBranchSelected] with the target
/// branch index so the routing logic stays in the shell.
class HomeNavigationBar extends StatelessWidget {
  const HomeNavigationBar({
    super.key,
    required this.role,
    required this.currentBranch,
    required this.unreadCount,
    required this.onBranchSelected,
  });

  final String? role;
  final int currentBranch;
  final int unreadCount;
  final ValueChanged<int> onBranchSelected;

  @override
  Widget build(BuildContext context) {
    final items = _itemsForRole(role);
    var selectedIndex = items.indexWhere(
      (item) => item.branchIndex == currentBranch,
    );
    if (selectedIndex < 0) selectedIndex = 0;

    return NavigationBar(
      selectedIndex: selectedIndex,
      onDestinationSelected: (index) =>
          onBranchSelected(items[index].branchIndex),
      destinations: [
        for (final item in items)
          NavigationDestination(
            icon: _navIcon(item, item.icon),
            selectedIcon: _navIcon(item, item.selectedIcon),
            label: item.label,
          ),
      ],
    );
  }

  /// Wraps the notifications icon in an unread-count badge (capped at
  /// "99", like the web bell).
  Widget _navIcon(_NavItem item, IconData icon) {
    final iconWidget = Icon(icon);
    if (item.branchIndex != _notifications.branchIndex || unreadCount <= 0) {
      return iconWidget;
    }
    return Badge(
      label: Text(unreadCount > 99 ? '99' : '$unreadCount'),
      child: iconWidget,
    );
  }
}
