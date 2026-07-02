import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/app_scope.dart';
import '../../core/formatters.dart';
import '../../domain/models/dispute.dart';
import '../../ui/theme.dart';
import '../../ui/widgets/empty_state.dart';
import '../../ui/widgets/error_state.dart';
import '../../ui/widgets/loading_state.dart';
import '../../ui/widgets/section_header.dart';
import '../../ui/widgets/status_badge.dart';
import '../../ui/widgets/tappable_list_card.dart';

/// Dispute list for both roles: paused milestones with funds locked
/// until they are resolved (web parity).
class DisputesScreen extends StatefulWidget {
  const DisputesScreen({super.key});

  @override
  State<DisputesScreen> createState() => _DisputesScreenState();
}

class _DisputesScreenState extends State<DisputesScreen> {
  List<Dispute>? _disputes;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _disputes = null;
      _error = null;
    });
    try {
      final disputes = await AppScope.read(context).disputes.list();
      if (mounted) setState(() => _disputes = disputes);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'An unexpected error occurred.');
    }
  }

  Future<void> _openDetail(Dispute dispute) async {
    await context.push('/disputes/${dispute.id}');
    if (mounted) await _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Disputes')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            const SectionHeader(
              title: 'Disputes',
              subtitle:
                  'Paused milestones with funds locked until they are '
                  'resolved',
            ),
            const SizedBox(height: 16),
            ..._buildContent(),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildContent() {
    if (_error != null) {
      return [ErrorState(message: _error!, onRetry: _load)];
    }
    final disputes = _disputes;
    if (disputes == null) {
      return const [
        Padding(
          padding: EdgeInsets.only(top: 120),
          child: LoadingState(label: 'Loading disputes…'),
        ),
      ];
    }
    if (disputes.isEmpty) {
      return const [
        SizedBox(height: 80),
        EmptyState(
          icon: Icons.gavel_outlined,
          title: 'No disputes',
          hint: "You can open one from a milestone's detail view.",
        ),
      ];
    }
    return [
      for (var i = 0; i < disputes.length; i++) ...[
        if (i > 0) const SizedBox(height: 12),
        _DisputeCard(
          dispute: disputes[i],
          onTap: () => _openDetail(disputes[i]),
        ),
      ],
    ];
  }
}

class _DisputeCard extends StatelessWidget {
  const _DisputeCard({required this.dispute, required this.onTap});

  final Dispute dispute;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final milestone = dispute.milestone;
    return TappableListCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  milestone?.title ?? emptyPlaceholder,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: colors.text,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              StatusBadge.dispute(dispute.status),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            milestone?.contractTitle ?? emptyPlaceholder,
            style: TextStyle(fontSize: 13, color: colors.textMuted),
          ),
          const SizedBox(height: 4),
          Text(
            'Opened by ${dispute.openedByEmail ?? emptyPlaceholder}',
            style: TextStyle(fontSize: 13, color: colors.textMuted),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                formatUsdc(milestone?.amount),
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: colors.primary,
                ),
              ),
              Text(
                formatDateTime(dispute.createdAt),
                style: TextStyle(fontSize: 12.5, color: colors.textMuted),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
