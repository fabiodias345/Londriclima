import 'package:flutter/material.dart';

// @version:1.1.0
// Neumorphism Bold Palette
const neuroBase = Color(0xFFF0F2F5);
const neroSurface = Color(0xFFE8EAED);
const neuroElevated = Color(0xFFFFFFFF);
const neuroText = Color(0xFF1A1A1A);
const neuroMuted = Color(0xFF8E8E93);
const neuroPrimary = Color(0xFF3A3A3C);
const neuroAccent = Color(0xFF5AC8FA);
const neuroSuccess = Color(0xFF34C759);
const neuroWarning = Color(0xFFFF9500);
const neuroDanger = Color(0xFFFF3B30);
const neuroShadowDark = Color(0x1A000000);
const neuroShadowLight = Color(0x0DFFFFFF);

// Legacy colors (for backward compatibility)
const airmovebrPrimary = neuroPrimary;
const airmovebrAccent = neuroAccent;
const airmovebrSurface = neuroBase;
const airmovebrText = neuroText;
const airmovebrMuted = neuroMuted;
const airmovebrBorder = neroSurface;
const airmovebrSuccess = neuroSuccess;
const airmovebrWarning = neuroWarning;
const airmovebrDanger = neuroDanger;
const airmovebrRequiredMissingFill = Color(0xFFEAF4FF);
const airmovebrRequiredMissingBorder = Color(0xFF7CB7E8);

ThemeData buildAirmovebrTheme() {
  return ThemeData(
    colorScheme: ColorScheme.fromSeed(
      seedColor: neuroPrimary,
      primary: neuroPrimary,
      secondary: neuroAccent,
      error: neuroDanger,
      surface: neuroElevated,
      brightness: Brightness.light,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: neuroBase,
      foregroundColor: neuroText,
      centerTitle: false,
      elevation: 0,
      shadowColor: neuroShadowDark,
      titleTextStyle: TextStyle(
        color: neuroText,
        fontSize: 22,
        fontWeight: FontWeight.w900,
      ),
    ),
    scaffoldBackgroundColor: neuroBase,
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: neuroElevated,
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      border: _neuromophicInputBorder(),
      enabledBorder: _neuromophicInputBorder(),
      focusedBorder: _neuromophicInputBorder(focused: true),
      labelStyle: const TextStyle(
        color: neuroMuted,
        fontWeight: FontWeight.w600,
        fontSize: 14,
      ),
      hintStyle: const TextStyle(
        color: neuroMuted,
        fontWeight: FontWeight.w500,
        fontSize: 14,
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(56),
        backgroundColor: neuroPrimary,
        foregroundColor: neuroElevated,
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        elevation: 6,
        shadowColor: neuroShadowDark,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(54),
        foregroundColor: neuroPrimary,
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
        side: const BorderSide(color: neroSurface, width: 2),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    textTheme: const TextTheme(
      bodyLarge: TextStyle(
        color: neuroText,
        fontWeight: FontWeight.w500,
        fontSize: 16,
      ),
      bodyMedium: TextStyle(
        color: neuroText,
        fontWeight: FontWeight.w500,
        fontSize: 14,
      ),
      bodySmall: TextStyle(
        color: neuroMuted,
        fontWeight: FontWeight.w400,
        fontSize: 12,
      ),
      headlineSmall: TextStyle(
        color: neuroText,
        fontWeight: FontWeight.w700,
        fontSize: 18,
      ),
      labelLarge: TextStyle(
        color: neuroText,
        fontWeight: FontWeight.w600,
        fontSize: 14,
      ),
    ),
    useMaterial3: true,
  );
}

OutlineInputBorder _neuromophicInputBorder({bool focused = false}) {
  return OutlineInputBorder(
    borderRadius: BorderRadius.circular(16),
    borderSide: BorderSide(
      color: focused ? neuroAccent : neroSurface,
      width: focused ? 2.5 : 2,
    ),
  );
}

BoxDecoration neuroElevatedBox({double elevation = 8}) {
  return BoxDecoration(
    color: neuroElevated,
    borderRadius: BorderRadius.circular(16),
    boxShadow: [
      BoxShadow(
        color: neuroShadowDark,
        blurRadius: elevation,
        offset: Offset(0, elevation * 0.5),
        spreadRadius: 0,
      ),
      BoxShadow(
        color: neuroShadowLight,
        blurRadius: elevation * 0.75,
        offset: const Offset(0, -2),
        spreadRadius: 0,
      ),
    ],
  );
}

BoxDecoration neuroInsetBox({double depth = 4}) {
  return BoxDecoration(
    color: neuroBase,
    borderRadius: BorderRadius.circular(16),
    boxShadow: [
      BoxShadow(
        color: neuroShadowDark,
        blurRadius: depth,
        offset: Offset(depth * 0.5, depth * 0.5),
        spreadRadius: 0,
      ),
      BoxShadow(
        color: neuroShadowLight,
        blurRadius: depth,
        offset: Offset(-depth * 0.5, -depth * 0.5),
        spreadRadius: 0,
      ),
    ],
  );
}
