import 'package:flutter/material.dart';

/// "Andean Precision" design tokens and Material 3 themes.
///
/// Mirrors the web design system exactly: depth comes from 1px hairline
/// borders instead of elevation, radius 8 for cards, 6 for inputs and
/// buttons, pill 999 for badges. The gold accent is a rare micro-accent
/// and must never cover large surfaces.

/// Raw color tokens for one brightness, exposed as a [ThemeExtension] so
/// widgets can read the exact palette from the current [Theme].
class AppColors extends ThemeExtension<AppColors> {
  const AppColors({
    required this.primary,
    required this.primaryHover,
    required this.primaryActive,
    required this.primarySubtle,
    required this.gold,
    required this.bg,
    required this.surface,
    required this.surface2,
    required this.border,
    required this.text,
    required this.textMuted,
    required this.textFaint,
    required this.success,
    required this.successBg,
    required this.warning,
    required this.warningBg,
    required this.danger,
    required this.dangerBg,
    required this.info,
    required this.infoBg,
  });

  final Color primary;
  final Color primaryHover;
  final Color primaryActive;
  final Color primarySubtle;
  final Color gold;
  final Color bg;
  final Color surface;
  final Color surface2;
  final Color border;
  final Color text;
  final Color textMuted;
  final Color textFaint;
  final Color success;
  final Color successBg;
  final Color warning;
  final Color warningBg;
  final Color danger;
  final Color dangerBg;
  final Color info;
  final Color infoBg;

  /// Light palette (default).
  static const AppColors light = AppColors(
    primary: Color(0xFF1466B8),
    primaryHover: Color(0xFF11589E),
    primaryActive: Color(0xFF0E4C88),
    primarySubtle: Color(0xFFE8F1FA),
    gold: Color(0xFFC99A2E),
    bg: Color(0xFFF7F8FA),
    surface: Color(0xFFFFFFFF),
    surface2: Color(0xFFF1F3F6),
    border: Color(0xFFE4E8EC),
    text: Color(0xFF0F172A),
    textMuted: Color(0xFF5B6573),
    textFaint: Color(0xFF94A3B8),
    success: Color(0xFF15803D),
    successBg: Color(0xFFE7F3EC),
    warning: Color(0xFFB45309),
    warningBg: Color(0xFFF7EEDE),
    danger: Color(0xFFDC2626),
    dangerBg: Color(0xFFFBEAEA),
    info: Color(0xFF1466B8),
    infoBg: Color(0xFFE8F1FA),
  );

  /// Dark palette.
  static const AppColors dark = AppColors(
    primary: Color(0xFF4D97E6),
    primaryHover: Color(0xFF5FA3EA),
    primaryActive: Color(0xFF3F86D4),
    primarySubtle: Color(0xFF15263A),
    gold: Color(0xFFD4A73E),
    bg: Color(0xFF0D1117),
    surface: Color(0xFF161B22),
    surface2: Color(0xFF1C2230),
    border: Color(0xFF2A313C),
    text: Color(0xFFE6EDF3),
    textMuted: Color(0xFF9AA6B2),
    textFaint: Color(0xFF6B7280),
    success: Color(0xFF3FB96A),
    successBg: Color(0xFF122A1C),
    warning: Color(0xFFD99227),
    warningBg: Color(0xFF2C2410),
    danger: Color(0xFFF0656A),
    dangerBg: Color(0xFF2C1416),
    info: Color(0xFF4D97E6),
    infoBg: Color(0xFF15263A),
  );

  /// Reads the palette from the nearest [Theme].
  static AppColors of(BuildContext context) =>
      Theme.of(context).extension<AppColors>() ?? AppColors.light;

  @override
  AppColors copyWith() => this;

  @override
  AppColors lerp(ThemeExtension<AppColors>? other, double t) {
    if (other is! AppColors) return this;
    Color mix(Color a, Color b) => Color.lerp(a, b, t) ?? b;
    return AppColors(
      primary: mix(primary, other.primary),
      primaryHover: mix(primaryHover, other.primaryHover),
      primaryActive: mix(primaryActive, other.primaryActive),
      primarySubtle: mix(primarySubtle, other.primarySubtle),
      gold: mix(gold, other.gold),
      bg: mix(bg, other.bg),
      surface: mix(surface, other.surface),
      surface2: mix(surface2, other.surface2),
      border: mix(border, other.border),
      text: mix(text, other.text),
      textMuted: mix(textMuted, other.textMuted),
      textFaint: mix(textFaint, other.textFaint),
      success: mix(success, other.success),
      successBg: mix(successBg, other.successBg),
      warning: mix(warning, other.warning),
      warningBg: mix(warningBg, other.warningBg),
      danger: mix(danger, other.danger),
      dangerBg: mix(dangerBg, other.dangerBg),
      info: mix(info, other.info),
      infoBg: mix(infoBg, other.infoBg),
    );
  }
}

/// Semantic tone of a badge or hint (parity with the web `Badge` tones).
enum Tone { neutral, info, success, warning, danger }

/// Resolves the foreground and tinted background for each [Tone].
class AppTones {
  const AppTones(this.colors);

  final AppColors colors;

  static AppTones of(BuildContext context) => AppTones(AppColors.of(context));

  /// Solid semantic text color for [tone].
  Color color(Tone tone) => switch (tone) {
    Tone.neutral => colors.textMuted,
    Tone.info => colors.info,
    Tone.success => colors.success,
    Tone.warning => colors.warning,
    Tone.danger => colors.danger,
  };

  /// Tinted background color for [tone].
  Color background(Tone tone) => switch (tone) {
    Tone.neutral => colors.surface2,
    Tone.info => colors.infoBg,
    Tone.success => colors.successBg,
    Tone.warning => colors.warningBg,
    Tone.danger => colors.dangerBg,
  };
}

/// Entity whose status is being mapped to a label and tone.
enum StatusKind {
  contract,
  milestone,
  escrow,
  payroll,
  payrollExecution,
  deliverable,
  dispute,
  invitation,
  role,
}

String _capitalize(String value) =>
    value.isEmpty ? value : value[0].toUpperCase() + value.substring(1);

/// Semantic tone for an entity status (copied from the web labels mapping).
Tone statusTone(StatusKind kind, String status) {
  switch (kind) {
    case StatusKind.contract:
      return switch (status) {
        'draft' => Tone.neutral,
        'pending_acceptance' || 'changes_requested' => Tone.warning,
        'accepted' || 'active' => Tone.info,
        'completed' => Tone.success,
        'rejected' => Tone.danger,
        _ => Tone.neutral,
      };
    case StatusKind.milestone:
      return switch (status) {
        'pending' => Tone.neutral,
        'submitted' || 'in_review' => Tone.warning,
        'approved' => Tone.info,
        'released' => Tone.success,
        'disputed' => Tone.danger,
        _ => Tone.neutral,
      };
    case StatusKind.escrow:
      return switch (status) {
        'released' => Tone.success,
        'disputed' => Tone.danger,
        _ => Tone.info,
      };
    case StatusKind.payroll:
      return switch (status) {
        'draft' => Tone.neutral,
        'funded' => Tone.info,
        'active' => Tone.success,
        'paused' => Tone.warning,
        'completed' => Tone.neutral,
        _ => Tone.neutral,
      };
    case StatusKind.payrollExecution:
      return switch (status) {
        'succeeded' => Tone.success,
        'failed' => Tone.danger,
        'partial' => Tone.warning,
        'pending' => Tone.info,
        _ => Tone.neutral,
      };
    case StatusKind.deliverable:
      return switch (status) {
        'submitted' => Tone.info,
        'changes_requested' => Tone.warning,
        'approved' => Tone.success,
        _ => Tone.neutral,
      };
    case StatusKind.dispute:
      return switch (status) {
        'open' => Tone.danger,
        'under_review' || 'escalated' => Tone.warning,
        'resolved' => Tone.success,
        'closed' => Tone.neutral,
        _ => Tone.neutral,
      };
    case StatusKind.invitation:
      return switch (status) {
        'accepted' => Tone.success,
        'pending' => Tone.info,
        _ => Tone.neutral,
      };
    case StatusKind.role:
      return Tone.neutral;
  }
}

/// English label for an entity status (copied from the web labels mapping).
String statusLabel(StatusKind kind, String status) {
  switch (kind) {
    case StatusKind.contract:
      return switch (status) {
        'draft' => 'Draft',
        'pending_acceptance' => 'Pending acceptance',
        'changes_requested' => 'Changes requested',
        'accepted' => 'Accepted',
        'active' => 'Active',
        'completed' => 'Completed',
        'rejected' => 'Rejected',
        _ => _capitalize(status),
      };
    case StatusKind.milestone:
      return switch (status) {
        'pending' => 'Pending',
        'submitted' => 'Submitted',
        'in_review' => 'In review',
        'approved' => 'Approved',
        'released' => 'Paid',
        'disputed' => 'Disputed',
        _ => _capitalize(status),
      };
    case StatusKind.escrow:
      return _capitalize(status);
    case StatusKind.payroll:
      return switch (status) {
        'draft' => 'Draft',
        'funded' => 'Funded',
        'active' => 'Active',
        'paused' => 'Paused',
        'completed' => 'Archived',
        _ => _capitalize(status),
      };
    case StatusKind.payrollExecution:
      return switch (status) {
        'succeeded' => 'Succeeded',
        'failed' => 'Failed',
        'partial' => 'Partial',
        'pending' => 'Pending',
        _ => _capitalize(status),
      };
    case StatusKind.deliverable:
      return switch (status) {
        'submitted' => 'Delivered',
        'changes_requested' => 'Changes requested',
        'approved' => 'Approved',
        _ => _capitalize(status),
      };
    case StatusKind.dispute:
      return switch (status) {
        'open' => 'Open',
        'under_review' => 'Under review',
        'escalated' => 'Escalated',
        'resolved' => 'Resolved',
        'closed' => 'Closed',
        _ => _capitalize(status),
      };
    case StatusKind.invitation:
      return switch (status) {
        'accepted' => 'Accepted',
        'pending' => 'Pending',
        _ => _capitalize(status),
      };
    case StatusKind.role:
      return switch (status) {
        'company' => 'Company',
        'freelancer' => 'Freelancer',
        'fixed_employee' => 'Fixed employee',
        'administrator' => 'Administrator',
        _ => _capitalize(status),
      };
  }
}

/// Builds the BolPay light and dark [ThemeData].
class AppTheme {
  AppTheme._();

  /// Card radius (8), input/button radius (6) and pill radius (999).
  static const double radiusCard = 8;
  static const double radiusControl = 6;
  static const double radiusPill = 999;

  static ThemeData get light => _build(AppColors.light, Brightness.light);
  static ThemeData get dark => _build(AppColors.dark, Brightness.dark);

  static ThemeData _build(AppColors c, Brightness brightness) {
    final onPrimary = brightness == Brightness.light
        ? Colors.white
        : const Color(0xFF0D1117);
    final scheme = ColorScheme(
      brightness: brightness,
      primary: c.primary,
      onPrimary: onPrimary,
      primaryContainer: c.primarySubtle,
      onPrimaryContainer: c.primary,
      secondary: c.textMuted,
      onSecondary: c.surface,
      tertiary: c.gold,
      onTertiary: onPrimary,
      tertiaryContainer: c.warningBg,
      onTertiaryContainer: c.warning,
      error: c.danger,
      onError: onPrimary,
      errorContainer: c.dangerBg,
      onErrorContainer: c.danger,
      surface: c.surface,
      onSurface: c.text,
      surfaceContainerHighest: c.surface2,
      surfaceContainerHigh: c.surface2,
      surfaceContainerLow: c.bg,
      onSurfaceVariant: c.textMuted,
      outline: c.border,
      outlineVariant: c.border,
      shadow: const Color(0x0F0F172A),
      scrim: const Color(0x8C0F172A),
      inverseSurface: c.text,
      onInverseSurface: c.surface,
      inversePrimary: c.primarySubtle,
    );

    final borderSide = BorderSide(color: c.border, width: 1);
    final controlShape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(radiusControl),
    );
    const buttonText = TextStyle(fontSize: 14, fontWeight: FontWeight.w600);
    const buttonPadding = EdgeInsets.symmetric(horizontal: 16, vertical: 10);

    final textTheme = Typography.material2021(platform: TargetPlatform.android)
        .black
        .apply(bodyColor: c.text, displayColor: c.text)
        .copyWith(
          headlineSmall: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w700,
            color: c.text,
          ),
          titleLarge: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: c.text,
          ),
          titleMedium: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: c.text,
          ),
          titleSmall: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: c.text,
          ),
          bodyLarge: TextStyle(fontSize: 16, height: 1.5, color: c.text),
          bodyMedium: TextStyle(fontSize: 14, height: 1.5, color: c.text),
          bodySmall: TextStyle(fontSize: 13, height: 1.4, color: c.textMuted),
          labelLarge: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: c.text,
          ),
          labelMedium: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: c.textMuted,
          ),
          labelSmall: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.2,
            color: c.textMuted,
          ),
        );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: c.bg,
      textTheme: textTheme,
      extensions: [c],
      dividerTheme: DividerThemeData(color: c.border, thickness: 1, space: 1),
      appBarTheme: AppBarTheme(
        backgroundColor: c.surface,
        foregroundColor: c.text,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w600,
          color: c.text,
        ),
        shape: Border(bottom: borderSide),
      ),
      cardTheme: CardThemeData(
        color: c.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusCard),
          side: borderSide,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: c.surface,
        hintStyle: TextStyle(color: c.textFaint),
        labelStyle: TextStyle(color: c.textMuted),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 12,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusControl),
          borderSide: borderSide,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusControl),
          borderSide: borderSide,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusControl),
          borderSide: BorderSide(color: c.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusControl),
          borderSide: BorderSide(color: c.danger, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusControl),
          borderSide: BorderSide(color: c.danger, width: 1.5),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: c.primary,
          foregroundColor: onPrimary,
          disabledBackgroundColor: c.primary.withValues(alpha: 0.55),
          disabledForegroundColor: onPrimary.withValues(alpha: 0.8),
          textStyle: buttonText,
          padding: buttonPadding,
          shape: controlShape,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: c.surface,
          foregroundColor: c.text,
          elevation: 0,
          textStyle: buttonText,
          padding: buttonPadding,
          shape: controlShape.copyWith(side: borderSide),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          backgroundColor: c.surface,
          foregroundColor: c.text,
          side: borderSide,
          textStyle: buttonText,
          padding: buttonPadding,
          shape: controlShape,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: c.primary,
          textStyle: buttonText,
          padding: buttonPadding,
          shape: controlShape,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: c.surface,
        elevation: 0,
        indicatorColor: c.primarySubtle,
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            color: states.contains(WidgetState.selected)
                ? c.primary
                : c.textMuted,
          ),
        ),
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: states.contains(WidgetState.selected)
                ? c.primary
                : c.textMuted,
          ),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: c.surface,
        contentTextStyle: TextStyle(fontSize: 13, color: c.text),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusCard),
          side: borderSide,
        ),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: c.surface,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(radiusCard)),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: c.surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusCard),
          side: borderSide,
        ),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(color: c.primary),
      listTileTheme: ListTileThemeData(
        iconColor: c.textMuted,
        textColor: c.text,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: c.surface2,
        labelStyle: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: c.textMuted,
        ),
        side: borderSide,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusPill),
        ),
      ),
    );
  }
}
