import 'package:flutter/material.dart';

import '../../core/app_scope.dart';
import '../../core/formatters.dart';
import '../../ui/widgets/feedback.dart';

/// Pantalla de inicio de sesión.
///
/// El usuario ingresa su email y la dirección Stellar (G-address) de su
/// wallet Pollar. La primera vez también elige su rol (freelancer o
/// empleado fijo) y opcionalmente su nombre.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _stellarController = TextEditingController();
  final _nameController = TextEditingController();

  bool _firstTime = false;
  String _role = 'freelancer';
  bool _loading = false;

  @override
  void dispose() {
    _emailController.dispose();
    _stellarController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  String? _validateEmail(String? value) {
    final email = value?.trim() ?? '';
    if (email.isEmpty) return 'Ingresa tu email';
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) {
      return 'Email inválido';
    }
    return null;
  }

  String? _validateStellar(String? value) {
    final address = value?.trim().toUpperCase() ?? '';
    if (address.isEmpty) return 'Ingresa tu dirección Stellar';
    if (!stellarAddressRegExp.hasMatch(address)) {
      return 'Dirección Stellar inválida (G… de 56 caracteres)';
    }
    return null;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    final auth = AppScope.read(context).auth;
    try {
      await auth.login(
        email: _emailController.text.trim(),
        stellarAddress: _stellarController.text.trim().toUpperCase(),
        role: _firstTime ? _role : null,
        name: _firstTime ? _nameController.text.trim() : null,
      );
      // El redirect del router lleva a /contracts automáticamente.
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                autovalidateMode: AutovalidateMode.onUserInteraction,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Icon(
                      Icons.account_balance_wallet_outlined,
                      size: 56,
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'BolPay',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Contratos freelance con escrow en Stellar',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 32),
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      autocorrect: false,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        prefixIcon: Icon(Icons.mail_outline),
                        border: OutlineInputBorder(),
                      ),
                      validator: _validateEmail,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _stellarController,
                      autocorrect: false,
                      enableSuggestions: false,
                      maxLength: 56,
                      decoration: const InputDecoration(
                        labelText: 'Dirección Stellar (wallet Pollar)',
                        hintText: 'G…',
                        prefixIcon: Icon(Icons.key_outlined),
                        border: OutlineInputBorder(),
                        counterText: '',
                      ),
                      validator: _validateStellar,
                    ),
                    const SizedBox(height: 8),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Es mi primer ingreso'),
                      subtitle: const Text('Elige tu rol en la plataforma'),
                      value: _firstTime,
                      onChanged: (v) => setState(() => _firstTime = v),
                    ),
                    if (_firstTime) ...[
                      const SizedBox(height: 8),
                      SegmentedButton<String>(
                        segments: const [
                          ButtonSegment(
                            value: 'freelancer',
                            label: Text('Freelancer'),
                            icon: Icon(Icons.work_outline),
                          ),
                          ButtonSegment(
                            value: 'fixed_employee',
                            label: Text('Empleado fijo'),
                            icon: Icon(Icons.badge_outlined),
                          ),
                        ],
                        selected: {_role},
                        onSelectionChanged: (selection) =>
                            setState(() => _role = selection.first),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _nameController,
                        textCapitalization: TextCapitalization.words,
                        decoration: const InputDecoration(
                          labelText: 'Nombre (opcional)',
                          prefixIcon: Icon(Icons.person_outline),
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: _loading ? null : _submit,
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: _loading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Iniciar sesión'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
