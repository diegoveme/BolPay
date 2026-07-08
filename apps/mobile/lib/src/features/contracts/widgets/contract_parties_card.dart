import 'package:flutter/material.dart';

import '../../../core/formatters.dart';
import '../../../domain/models/contract.dart';
import '../../../ui/widgets/app_card.dart';
import 'party_card.dart';

/// "Parties" card of the contract detail: the company mini-profile stacked
/// over the freelancer mini-profile, each rendered with [PartyCard].
class ContractPartiesCard extends StatelessWidget {
  const ContractPartiesCard({
    super.key,
    required this.contract,
    required this.freelancerName,
  });

  final Contract contract;
  final String freelancerName;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      title: 'Parties',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          PartyCard(
            label: 'Company',
            name: contract.companyName ?? emptyPlaceholder,
            avatarUrl: contract.company?.avatarUrl,
            subtitle: [
              contract.company?.industry,
              contract.company?.location,
            ].whereType<String>().where((s) => s.isNotEmpty).join(' · '),
            website: contract.company?.website,
          ),
          const SizedBox(height: 16),
          PartyCard(
            label: 'Freelancer',
            name: freelancerName,
            avatarUrl: contract.freelancer?.avatarUrl,
            subtitle: [
              contract.freelancer?.headline,
              contract.freelancer?.location,
            ].whereType<String>().where((s) => s.isNotEmpty).join(' · '),
            website: contract.freelancer?.website,
            skills: contract.freelancer?.skills ?? const [],
          ),
        ],
      ),
    );
  }
}
