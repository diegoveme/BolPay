import 'package:flutter/material.dart';

import '../../../domain/models/milestone.dart';
import '../../../ui/widgets/app_card.dart';
import 'milestone_tile.dart';

/// "Milestones" card of the contract detail: renders one [MilestoneTile]
/// per milestone and forwards each row action back to the screen handlers.
class MilestonesSection extends StatelessWidget {
  const MilestonesSection({
    super.key,
    required this.milestones,
    required this.isCompany,
    required this.isFreelancer,
    required this.contractActive,
    required this.escrowFunded,
    required this.busy,
    required this.onUploadDeliverable,
    required this.onApprove,
    required this.onRequestChanges,
    required this.onOpenDispute,
    required this.onViewDispute,
  });

  final List<Milestone> milestones;
  final bool isCompany;
  final bool isFreelancer;
  final bool contractActive;
  final bool escrowFunded;
  final bool busy;
  final ValueChanged<Milestone> onUploadDeliverable;
  final ValueChanged<Milestone> onApprove;
  final ValueChanged<Milestone> onRequestChanges;
  final ValueChanged<Milestone> onOpenDispute;
  final ValueChanged<String> onViewDispute;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      title: 'Milestones (${milestones.length})',
      child: Column(
        children: [
          for (var i = 0; i < milestones.length; i++)
            MilestoneTile(
              milestone: milestones[i],
              index: i,
              isCompany: isCompany,
              isFreelancer: isFreelancer,
              contractActive: contractActive,
              escrowFunded: escrowFunded,
              busy: busy,
              onUploadDeliverable: () => onUploadDeliverable(milestones[i]),
              onApprove: () => onApprove(milestones[i]),
              onRequestChanges: () => onRequestChanges(milestones[i]),
              onOpenDispute: () => onOpenDispute(milestones[i]),
              onViewDispute: onViewDispute,
            ),
        ],
      ),
    );
  }
}
