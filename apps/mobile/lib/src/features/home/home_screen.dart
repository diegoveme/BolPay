import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/app_scope.dart';
import '../../domain/models/escrow.dart';
import '../../state/auth_state.dart';
import '../../ui/theme.dart';
import 'widgets/home_navigation_bar.dart';
import 'widgets/trustline_banner.dart';
import 'widgets/verify_email_banner.dart';

/// Authenticated shell: role-aware bottom navigation with an unread
/// notifications badge refreshed every 60 seconds, plus the verify-email
/// and USDC-trustline banners shown above every tab (web AppLayout
/// parity).
class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> with WidgetsBindingObserver {
  Timer? _unreadTimer;
  int _unreadCount = 0;

  AuthState? _auth;
  TrustlineStatus? _trustline;
  String? _trustlineAddress;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      // Web parity: refresh /auth/me on mount so the email-verified flag
      // (and thus the banner) reflects reality, not the login snapshot.
      AppScope.read(context).auth.refreshUser();
      _refreshUnread();
      _unreadTimer = Timer.periodic(
        const Duration(seconds: 60),
        (_) => _refreshUnread(),
      );
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final auth = AppScope.of(context).auth;
    if (_auth != auth) {
      _auth?.removeListener(_onAuthChanged);
      _auth = auth;
      auth.addListener(_onAuthChanged);
      _syncTrustline();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _auth?.removeListener(_onAuthChanged);
    _unreadTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) return;
    // Web parity: re-sync on focus (email may have been verified or the
    // trustline enabled from another device in the meantime).
    _auth?.refreshUser();
    _refreshUnread();
    _reloadTrustline();
  }

  void _onAuthChanged() => _syncTrustline();

  Future<void> _refreshUnread() async {
    if (!mounted) return;
    try {
      final count = await AppScope.read(context).notifications.unreadCount();
      if (mounted) setState(() => _unreadCount = count);
    } catch (_) {
      // Silent: the badge simply keeps its last value while offline.
    }
  }

  /// Re-checks the trustline when the session wallet address changes.
  void _syncTrustline() {
    final address = _auth?.user?.stellarAddress;
    if (address == _trustlineAddress) return;
    _trustlineAddress = address;
    if (mounted) setState(() => _trustline = null);
    _reloadTrustline();
  }

  Future<void> _reloadTrustline() async {
    final address = _trustlineAddress;
    if (address == null || address.isEmpty || !mounted) return;
    try {
      final status = await AppScope.read(
        context,
      ).escrows.trustlineStatus(address);
      if (mounted && _trustlineAddress == address) {
        setState(() => _trustline = status);
      }
    } catch (_) {
      // Silent: the banner simply stays hidden until the check succeeds.
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = AppScope.of(context).auth;
    final colors = AppColors.of(context);
    return ListenableBuilder(
      listenable: auth,
      builder: (context, _) {
        final user = auth.user;
        final currentBranch = widget.navigationShell.currentIndex;

        final showVerify = user != null && !user.emailVerified;
        final address = user?.stellarAddress;
        final showTrustline =
            address != null &&
            address.isNotEmpty &&
            _trustline != null &&
            !_trustline!.hasTrustline;
        final showBanners = showVerify || showTrustline;

        return Scaffold(
          body: Column(
            children: [
              if (showBanners)
                ColoredBox(
                  color: colors.warningBg,
                  child: SafeArea(
                    bottom: false,
                    child: Column(
                      children: [
                        if (showVerify) const VerifyEmailBanner(),
                        if (showVerify && showTrustline)
                          Divider(
                            height: 1,
                            color: colors.warning.withValues(alpha: 0.2),
                          ),
                        if (showTrustline)
                          TrustlineBanner(
                            address: address,
                            onChanged: _reloadTrustline,
                          ),
                      ],
                    ),
                  ),
                ),
              Expanded(
                // When the banners occupy the status-bar area, the inner
                // scaffolds must not re-apply the top inset.
                child: MediaQuery.removePadding(
                  context: context,
                  removeTop: showBanners,
                  child: widget.navigationShell,
                ),
              ),
            ],
          ),
          bottomNavigationBar: HomeNavigationBar(
            role: user?.role,
            currentBranch: currentBranch,
            unreadCount: _unreadCount,
            onBranchSelected: (target) {
              widget.navigationShell.goBranch(
                target,
                initialLocation: target == currentBranch,
              );
            },
          ),
        );
      },
    );
  }
}
