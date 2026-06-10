import 'package:flutter/material.dart';

import '../../core/api_config.dart';
import '../../core/app_scope.dart';
import '../../core/formatters.dart';

/// Perfil del usuario: datos, wallet Stellar y cierre de sesión.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  String _roleLabel(String role) {
    switch (role) {
      case 'freelancer':
        return 'Freelancer';
      case 'fixed_employee':
        return 'Empleado fijo';
      case 'company':
        return 'Empresa';
      case 'administrator':
        return 'Administrador';
      default:
        return role;
    }
  }

  Future<void> _confirmLogout(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Cerrar sesión'),
        content: const Text('¿Seguro que quieres cerrar sesión?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Cerrar sesión'),
          ),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      await AppScope.read(context).auth.logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final auth = AppScope.of(context).auth;
    return ListenableBuilder(
      listenable: auth,
      builder: (context, _) {
        final user = auth.user;
        final displayName = user?.displayName ?? '';
        final initial = displayName.isEmpty
            ? '?'
            : displayName[0].toUpperCase();
        return Scaffold(
          appBar: AppBar(title: const Text('Perfil')),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Center(
                child: CircleAvatar(
                  radius: 36,
                  backgroundColor: theme.colorScheme.primaryContainer,
                  child: Text(
                    initial,
                    style: theme.textTheme.headlineMedium?.copyWith(
                      color: theme.colorScheme.onPrimaryContainer,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Center(
                child: Text(
                  user?.displayName ?? 'Usuario',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              if (user != null)
                Center(
                  child: Text(
                    _roleLabel(user.role),
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ),
              const SizedBox(height: 24),
              Card(
                margin: EdgeInsets.zero,
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(Icons.mail_outline),
                      title: const Text('Email'),
                      subtitle: Text(user?.email ?? '—'),
                    ),
                    const Divider(height: 1),
                    if (user == null || user.wallets.isEmpty)
                      const ListTile(
                        leading: Icon(Icons.account_balance_wallet_outlined),
                        title: Text('Wallet Stellar'),
                        subtitle: Text('Sin wallet registrada'),
                      )
                    else
                      for (final wallet in user.wallets)
                        ListTile(
                          leading: const Icon(
                            Icons.account_balance_wallet_outlined,
                          ),
                          title: Text(
                            wallet.isPrimary
                                ? 'Wallet Stellar (principal)'
                                : 'Wallet Stellar',
                          ),
                          subtitle: Text(shortAddress(wallet.address)),
                        ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Card(
                margin: EdgeInsets.zero,
                child: ListTile(
                  leading: const Icon(Icons.dns_outlined),
                  title: const Text('Servidor'),
                  subtitle: Text(ApiConfig.baseUrl),
                ),
              ),
              const SizedBox(height: 24),
              OutlinedButton.icon(
                onPressed: () => _confirmLogout(context),
                style: OutlinedButton.styleFrom(
                  foregroundColor: theme.colorScheme.error,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                icon: const Icon(Icons.logout),
                label: const Text('Cerrar sesión'),
              ),
            ],
          ),
        );
      },
    );
  }
}
