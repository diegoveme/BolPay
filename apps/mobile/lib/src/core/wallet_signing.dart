import 'package:flutter/material.dart';

import '../ui/widgets/feedback.dart';
import 'api_client.dart';
import 'app_scope.dart';

/// How a prepare-endpoint XDR was resolved.
enum SignStatus {
  /// Null XDR (simulated escrow mode): continue and confirm WITHOUT a
  /// txHash.
  proceedUnsigned,

  /// The custodial wallet signed AND broadcast the transaction: continue
  /// and pass [SignOutcome.txHash] to the confirm call.
  signed,

  /// The flow must stop: manual wallet (sign on the web app), expired
  /// custodial session, on-chain failure or user cancellation. The user
  /// was already informed.
  aborted,
}

/// Result of [resolveSignature].
class SignOutcome {
  const SignOutcome._(this.status, this.txHash);

  const SignOutcome.signed(String txHash) : this._(SignStatus.signed, txHash);

  static const SignOutcome proceedUnsigned = SignOutcome._(
    SignStatus.proceedUnsigned,
    null,
  );
  static const SignOutcome aborted = SignOutcome._(SignStatus.aborted, null);

  final SignStatus status;

  /// On-chain transaction hash, only for [SignStatus.signed].
  final String? txHash;

  bool get canProceed => status != SignStatus.aborted;
}

/// Enforces the mobile signing rule shared by the fund, accept, deliver,
/// approve, dispute and trustline flows.
///
/// In simulated escrow mode every prepare endpoint returns a null XDR and
/// the flow simply continues. When a prepare endpoint returns a real XDR
/// (trustless_work mode):
///  - a custodial session (walletSource 'pollar') signs and broadcasts it
///    through the wallet service, and the hash is returned so confirm
///    endpoints that expect a txHash receive it (a PENDING status still
///    yields a usable hash, web parity);
///  - a manual session is pointed to the BolPay web app, as before.
Future<SignOutcome> resolveSignature(
  BuildContext context,
  String? unsignedXdr,
) async {
  if (unsignedXdr == null || unsignedXdr.isEmpty) {
    return SignOutcome.proceedUnsigned;
  }
  final scope = AppScope.read(context);
  final source = await scope.storage.readWalletSource();
  if (!context.mounted) return SignOutcome.aborted;

  if (source == 'pollar' && scope.pollar.isEnabled) {
    try {
      final outcome = await scope.pollar.signAndSendTx(unsignedXdr);
      if (outcome.isFailed) {
        if (context.mounted) {
          final detail = [
            outcome.message,
            outcome.resultCode,
          ].whereType<String>().where((part) => part.isNotEmpty).join(' · ');
          showErrorSnackBar(
            context,
            ApiException(
              0,
              detail.isEmpty
                  ? 'The transaction failed on the network.'
                  : detail,
            ),
          );
        }
        return SignOutcome.aborted;
      }
      return SignOutcome.signed(outcome.hash);
    } on ApiException catch (e) {
      if (context.mounted) {
        showErrorSnackBar(
          context,
          e.statusCode == 401
              ? ApiException(
                  401,
                  'Your wallet session expired. Please sign in again '
                  'from the login screen.',
                )
              : e,
        );
      }
      return SignOutcome.aborted;
    }
  }

  // Manual wallet: the signature must happen where the wallet lives.
  await showDialog<void>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: const Text('Wallet signature required'),
      content: const Text(
        'This step needs your wallet signature. '
        'Please complete it on the BolPay web app.',
      ),
      actions: [
        FilledButton(
          onPressed: () => Navigator.of(dialogContext).pop(),
          child: const Text('OK'),
        ),
      ],
    ),
  );
  return SignOutcome.aborted;
}
