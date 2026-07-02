import 'package:flutter/material.dart';

import '../../../ui/widgets/app_card.dart';
import 'avatar_field.dart';
import 'profile_form_field.dart';

/// Editable company profile card. Controllers, avatar state, save state and
/// the save handler are owned by the screen; this widget only lays them out.
class CompanyFormCard extends StatelessWidget {
  const CompanyFormCard({
    super.key,
    required this.nameController,
    required this.locationController,
    required this.industryController,
    required this.websiteController,
    required this.descriptionController,
    required this.valuesController,
    required this.avatarUrl,
    required this.onAvatarChanged,
    required this.fallbackName,
    required this.saving,
    required this.onSave,
  });

  final TextEditingController nameController;
  final TextEditingController locationController;
  final TextEditingController industryController;
  final TextEditingController websiteController;
  final TextEditingController descriptionController;
  final TextEditingController valuesController;

  /// Current logo URL (may be empty).
  final String avatarUrl;

  final ValueChanged<String> onAvatarChanged;

  /// Name used for the avatar initials when no company name is set.
  final String fallbackName;

  /// Whether a save request is in flight.
  final bool saving;

  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      title: 'Company profile',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AvatarField(
            label: 'Logo (URL)',
            value: avatarUrl,
            name: nameController.text.isEmpty
                ? fallbackName
                : nameController.text,
            onChanged: onAvatarChanged,
          ),
          ProfileFormField(nameController, label: 'Company name'),
          ProfileFormField(
            locationController,
            label: 'Location',
            hint: 'Cuernavaca, Mexico',
          ),
          ProfileFormField(
            industryController,
            label: 'Sector / industry',
            hint: 'Software, fintech…',
          ),
          ProfileFormField(
            websiteController,
            label: 'Website',
            hint: 'https://yourcompany.com',
            keyboardType: TextInputType.url,
          ),
          ProfileFormField(
            descriptionController,
            label: 'Description',
            maxLines: 4,
          ),
          ProfileFormField(
            valuesController,
            label: 'Values / culture',
            hint: 'Transparency, quality, on-time delivery…',
            maxLines: 3,
          ),
          const SizedBox(height: 4),
          ProfileSaveButton(saving: saving, onSave: onSave),
        ],
      ),
    );
  }
}
