import 'package:flutter/material.dart';

import '../../../ui/theme.dart';
import '../../../ui/widgets/app_card.dart';
import '../../../ui/widgets/status_badge.dart';
import 'avatar_field.dart';
import 'profile_form_field.dart';

/// Editable freelancer profile card. Controllers, avatar state, the parsed
/// skills list, save state and the save handler are owned by the screen;
/// this widget only lays them out.
class FreelancerFormCard extends StatelessWidget {
  const FreelancerFormCard({
    super.key,
    required this.displayNameController,
    required this.locationController,
    required this.headlineController,
    required this.bioController,
    required this.skillsController,
    required this.websiteController,
    required this.linkedinController,
    required this.githubController,
    required this.avatarUrl,
    required this.onAvatarChanged,
    required this.fallbackName,
    required this.skills,
    required this.saving,
    required this.onSave,
  });

  final TextEditingController displayNameController;
  final TextEditingController locationController;
  final TextEditingController headlineController;
  final TextEditingController bioController;
  final TextEditingController skillsController;
  final TextEditingController websiteController;
  final TextEditingController linkedinController;
  final TextEditingController githubController;

  /// Current photo URL (may be empty).
  final String avatarUrl;

  final ValueChanged<String> onAvatarChanged;

  /// Name used for the avatar initials when no public name is set.
  final String fallbackName;

  /// Parsed, non-empty skills rendered as pills.
  final List<String> skills;

  /// Whether a save request is in flight.
  final bool saving;

  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      title: 'Professional profile',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AvatarField(
            label: 'Photo (URL)',
            value: avatarUrl,
            name: displayNameController.text.isEmpty
                ? fallbackName
                : displayNameController.text,
            onChanged: onAvatarChanged,
          ),
          ProfileFormField(displayNameController, label: 'Public name'),
          ProfileFormField(
            locationController,
            label: 'Location',
            hint: 'Lima, Peru',
          ),
          ProfileFormField(
            headlineController,
            label: 'Headline',
            hint: 'Full-stack developer · React / NestJS',
          ),
          ProfileFormField(
            bioController,
            label: 'Bio',
            hint: "Tell companies what you're great at…",
            maxLines: 4,
          ),
          ProfileFormField(
            skillsController,
            label: 'Skills (comma-separated)',
            hint: 'React, NestJS, UI/UX, Figma',
          ),
          if (skills.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final skill in skills)
                    TonePill(label: skill, tone: Tone.neutral),
                ],
              ),
            ),
          ProfileFormField(
            websiteController,
            label: 'Site / portfolio',
            hint: 'https://myportfolio.com',
            keyboardType: TextInputType.url,
          ),
          ProfileFormField(
            linkedinController,
            label: 'LinkedIn',
            hint: 'https://linkedin.com/in/your-username',
            keyboardType: TextInputType.url,
          ),
          ProfileFormField(
            githubController,
            label: 'GitHub',
            hint: 'https://github.com/your-username',
            keyboardType: TextInputType.url,
          ),
          const SizedBox(height: 4),
          ProfileSaveButton(saving: saving, onSave: onSave),
        ],
      ),
    );
  }
}
