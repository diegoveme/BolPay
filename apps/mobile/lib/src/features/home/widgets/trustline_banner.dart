import 'package:flutter/material.dart';

import '../../../core/app_scope.dart';
import '../../../core/wallet_signing.dart';
import '../../../ui/theme.dart';
import '../../../ui/widgets/feedback.dart';

/// Warning banner shown while the wallet is missing the USDC trustline
/// (web `TrustlineBanner` parity). Without it the account can neither
/// fund an escrow nor receive payments.
///
/// "Enable USDC" calls the prepare endpoint. When it returns no XDR
/// (simulated escrow mode) nothing needs a signature; a custodial wallet
/// session signs and broadcasts the changeTrust transaction right here;
/// a manual session is pointed to the BolPay web app. The status is
/// re-checked afterwards in every case.
class TrustlineBanner extends StatefulWidget {
  const TrustlineBanner({
    super.key,
    required this.address,
    required this.onChanged,
  });

  /// Stellar address whose trustline is missing.
  final String address;

  /// Re-checks the trustline status (hides the banner once enabled).
  final Future<void> Function() onChanged;

  @override
  State<TrustlineBanner> createState() => _TrustlineBannerState();
}

class _TrustlineBannerState extends State<TrustlineBanner> {
  bool _busy = false;

  Future<void> _enable() async {
    setState(() => _busy = true);
    try {
      final xdr = await AppScope.read(
        context,
      ).escrows.prepareTrustline(widget.address);
      if (!mounted) return;
      // A custodial signature already broadcasts the changeTrust, so no
      // backend submit call is needed afterwards, only a status refresh.
      final sign = await resolveSignature(context, xdr);
      if (sign.canProceed) {
        await widget.onChanged();
        if (mounted) {
          showSuccessSnackBar(context, 'USDC enabled for your wallet');
        }
      } else {
        // The user may have completed it on the web in the meantime.
        await widget.onChanged();
      }
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Container(
      width: double.infinity,
      color: colors.warningBg,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              'Your wallet cannot send or receive USDC payments yet. '
              'Enable the asset (USDC trustline) so you can fund and get '
              'paid from the escrow.',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: colors.warning,
              ),
            ),
          ),
          const SizedBox(width: 12),
          TextButton(
            onPressed: _busy ? null : _enable,
            style: TextButton.styleFrom(
              foregroundColor: colors.warning,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: _busy
                ? SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: colors.warning,
                    ),
                  )
                : const Text('Enable USDC'),
          ),
        ],
      ),
    );
  }
}
