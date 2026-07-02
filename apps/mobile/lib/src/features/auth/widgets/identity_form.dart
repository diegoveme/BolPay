import 'package:flutter/material.dart';

import '../../../ui/theme.dart';
import '../../../ui/widgets/button_spinner.dart';
import 'upper_case_text_formatter.dart';

/// Email (+ Stellar address on the manual path) plus the error-driven
/// registration extras and the submit button.
class IdentityForm extends StatelessWidget {
  const IdentityForm({
    super.key,
    required this.connected,
    required this.needsRegistration,
    required this.role,
    required this.submitting,
    required this.emailController,
    required this.addressController,
    required this.nameController,
    required this.inviteController,
    required this.onRoleChanged,
    required this.onSubmit,
    required this.onStartOver,
    required this.validateEmail,
    required this.validateStellar,
  });

  final bool connected;
  final bool needsRegistration;
  final String role;
  final bool submitting;
  final TextEditingController emailController;
  final TextEditingController addressController;
  final TextEditingController nameController;
  final TextEditingController inviteController;
  final ValueChanged<String> onRoleChanged;
  final VoidCallback onSubmit;
  final VoidCallback onStartOver;
  final FormFieldValidator<String> validateEmail;
  final FormFieldValidator<String> validateStellar;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!connected) ...[
          Text(
            'Sign in with your wallet',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: colors.text,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Enter your email and the Stellar address of your wallet.',
            style: TextStyle(fontSize: 13, color: colors.textMuted),
          ),
          const SizedBox(height: 16),
        ],
        TextFormField(
          controller: emailController,
          keyboardType: TextInputType.emailAddress,
          autocorrect: false,
          decoration: const InputDecoration(
            labelText: 'Email',
            hintText: 'you@email.com',
            prefixIcon: Icon(Icons.mail_outline),
          ),
          validator: validateEmail,
        ),
        if (!connected) ...[
          const SizedBox(height: 16),
          TextFormField(
            controller: addressController,
            autocorrect: false,
            enableSuggestions: false,
            maxLength: 56,
            inputFormatters: [UpperCaseTextFormatter()],
            style: const TextStyle(
              fontFamily: 'monospace',
              fontSize: 14,
              letterSpacing: -0.1,
            ),
            decoration: const InputDecoration(
              labelText: 'Stellar address (your wallet)',
              hintText: 'G...',
              prefixIcon: Icon(Icons.key_outlined),
              counterText: '',
            ),
            validator: validateStellar,
          ),
        ],
        if (needsRegistration) ...[
          const SizedBox(height: 20),
          Text(
            'First time here? Complete your account to continue.',
            style: TextStyle(fontSize: 13, color: colors.textMuted),
          ),
          const SizedBox(height: 12),
          Text(
            'I want to use BolPay as',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: colors.textMuted,
            ),
          ),
          const SizedBox(height: 8),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'freelancer', label: Text('Freelancer')),
              ButtonSegment(value: 'company', label: Text('Company')),
              ButtonSegment(
                value: 'fixed_employee',
                label: Text('Fixed employee'),
              ),
            ],
            selected: {role},
            onSelectionChanged: (selection) => onRoleChanged(selection.first),
          ),
          const SizedBox(height: 16),
          // The name field follows the selected role.
          TextFormField(
            controller: nameController,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(
              labelText: role == 'company' ? 'Company name' : 'Name',
              hintText: role == 'company'
                  ? "Your company's name"
                  : 'Your full name',
              prefixIcon: Icon(
                role == 'company'
                    ? Icons.business_outlined
                    : Icons.person_outline,
              ),
            ),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: inviteController,
            autocorrect: false,
            enableSuggestions: false,
            decoration: const InputDecoration(
              labelText: 'Invitation code (optional)',
              helperText: 'If you were invited by email, paste the code here',
              prefixIcon: Icon(Icons.confirmation_number_outlined),
            ),
          ),
        ],
        const SizedBox(height: 24),
        FilledButton(
          onPressed: submitting ? null : onSubmit,
          style: FilledButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
          child: submitting
              ? const ButtonSpinner()
              : Text(
                  needsRegistration
                      ? 'Create account'
                      : connected
                      ? 'Continue'
                      : 'Sign in',
                ),
        ),
        if (needsRegistration) ...[
          const SizedBox(height: 8),
          TextButton(
            onPressed: submitting ? null : onStartOver,
            child: const Text('Start over'),
          ),
        ],
      ],
    );
  }
}
