import 'package:flutter/material.dart';

import '../../../ui/theme.dart';
import '../../../ui/widgets/async_select_field.dart';

/// Freelancer picker of the contract form (create only): the async select
/// with its invite-by-email path plus the explanatory helper texts.
class FreelancerPickerSection extends StatelessWidget {
  const FreelancerPickerSection({
    super.key,
    required this.freelancerId,
    required this.freelancerLabel,
    required this.invitedEmail,
    required this.onSearch,
    required this.onSelected,
    required this.onEmailInvite,
    required this.onClear,
  });

  final String freelancerId;
  final String freelancerLabel;
  final String invitedEmail;
  final Future<List<AsyncSelectOption<String>>> Function(String query) onSearch;
  final ValueChanged<AsyncSelectOption<String>> onSelected;
  final ValueChanged<String> onEmailInvite;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (freelancerId.isNotEmpty || invitedEmail.isNotEmpty)
          AsyncSelectField<String>(
            label: 'Freelancer',
            onSearch: (_) async => const [],
            onSelected: (_) {},
            selectedLabel: invitedEmail.isNotEmpty
                ? 'Invite $invitedEmail'
                : freelancerLabel,
            onClear: onClear,
          )
        else
          AsyncSelectField<String>(
            label: 'Freelancer',
            hint: 'Search by name or email, or type an email to invite…',
            emptyText: 'No matches. Type an email to invite.',
            allowEmailInvite: true,
            onSearch: onSearch,
            onSelected: onSelected,
            onEmailInvite: onEmailInvite,
          ),
        const SizedBox(height: 6),
        Text(
          'Freelancers you invited or already have a contract '
          'with appear here. If they are not listed, type their '
          'email to invite them and send the contract.',
          style: TextStyle(fontSize: 12.5, color: colors.textFaint),
        ),
        if (invitedEmail.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            'An invitation will be sent to $invitedEmail when '
            'the contract is created. Once they create an '
            'account and connect their wallet, they will see the '
            'contract to accept it or request changes.',
            style: TextStyle(fontSize: 13, color: colors.textMuted),
          ),
        ],
        const SizedBox(height: 14),
      ],
    );
  }
}
