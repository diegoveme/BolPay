import 'package:flutter/material.dart';

/// Tipo de entidad cuyo estado se muestra.
enum StatusKind { contract, milestone }

/// Badge de estado con color y etiqueta en español.
///
/// Estados de contrato: draft, pending_acceptance, changes_requested,
/// accepted, active, completed, rejected.
/// Estados de milestone: pending, submitted, in_review, approved,
/// released, disputed.
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.status, required this.kind});

  const StatusBadge.contract(String status, {Key? key})
    : this(key: key, status: status, kind: StatusKind.contract);

  const StatusBadge.milestone(String status, {Key? key})
    : this(key: key, status: status, kind: StatusKind.milestone);

  final String status;
  final StatusKind kind;

  /// Color asociado a cada estado (expuesto para tests y otros widgets).
  static Color colorFor(String status, StatusKind kind) {
    switch (kind) {
      case StatusKind.contract:
        switch (status) {
          case 'draft':
            return Colors.blueGrey;
          case 'pending_acceptance':
            return Colors.orange;
          case 'changes_requested':
            return Colors.deepOrange;
          case 'accepted':
            return Colors.teal;
          case 'active':
            return const Color(0xFF1B5FFF);
          case 'completed':
            return Colors.green;
          case 'rejected':
            return Colors.red;
          default:
            return Colors.grey;
        }
      case StatusKind.milestone:
        switch (status) {
          case 'pending':
            return Colors.blueGrey;
          case 'submitted':
            return const Color(0xFF1B5FFF);
          case 'in_review':
            return Colors.orange;
          case 'approved':
            return Colors.teal;
          case 'released':
            return Colors.green;
          case 'disputed':
            return Colors.red;
          default:
            return Colors.grey;
        }
    }
  }

  /// Etiqueta en español para cada estado.
  static String labelFor(String status, StatusKind kind) {
    switch (kind) {
      case StatusKind.contract:
        switch (status) {
          case 'draft':
            return 'Borrador';
          case 'pending_acceptance':
            return 'Pendiente de aceptación';
          case 'changes_requested':
            return 'Cambios solicitados';
          case 'accepted':
            return 'Aceptado';
          case 'active':
            return 'Activo';
          case 'completed':
            return 'Completado';
          case 'rejected':
            return 'Rechazado';
          default:
            return status;
        }
      case StatusKind.milestone:
        switch (status) {
          case 'pending':
            return 'Pendiente';
          case 'submitted':
            return 'Entregado';
          case 'in_review':
            return 'En revisión';
          case 'approved':
            return 'Aprobado';
          case 'released':
            return 'Pagado';
          case 'disputed':
            return 'En disputa';
          default:
            return status;
        }
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = colorFor(status, kind);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.45)),
      ),
      child: Text(
        labelFor(status, kind),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
