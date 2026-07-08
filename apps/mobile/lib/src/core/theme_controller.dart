import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// App-wide theme mode (system / light / dark), persisted locally so the
/// choice survives restarts. Listened to by the root MaterialApp.
class ThemeController extends ValueNotifier<ThemeMode> {
  ThemeController() : super(ThemeMode.system);

  static const _key = 'bolpay.themeMode';

  /// Loads the persisted choice at startup (defaults to system).
  Future<void> restore() async {
    final prefs = await SharedPreferences.getInstance();
    value = _fromName(prefs.getString(_key));
  }

  /// Applies and persists a new theme mode.
  Future<void> setMode(ThemeMode mode) async {
    value = mode;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, mode.name);
  }

  static ThemeMode _fromName(String? name) => switch (name) {
    'light' => ThemeMode.light,
    'dark' => ThemeMode.dark,
    _ => ThemeMode.system,
  };
}
