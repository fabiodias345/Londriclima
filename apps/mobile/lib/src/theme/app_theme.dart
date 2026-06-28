import 'package:flutter/material.dart';

const airmovebrPrimary = Color(0xFF073A55);
const airmovebrAccent = Color(0xFF12B7D6);
const airmovebrSurface = Color(0xFFF4F8FB);
const airmovebrText = Color(0xFF061C2A);
const airmovebrMuted = Color(0xFF58707C);
const airmovebrBorder = Color(0xFFD6E5EB);
const airmovebrSuccess = Color(0xFF0E8F5B);
const airmovebrWarning = Color(0xFFF4A62A);
const airmovebrDanger = Color(0xFFB3261E);
const airmovebrRequiredMissingFill = Color(0xFFEAF4FF);
const airmovebrRequiredMissingBorder = Color(0xFF7CB7E8);

ThemeData buildAirmovebrTheme() {
  return ThemeData(
    colorScheme: ColorScheme.fromSeed(
      seedColor: airmovebrPrimary,
      primary: airmovebrPrimary,
      secondary: airmovebrAccent,
      error: airmovebrDanger,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: airmovebrSurface,
      foregroundColor: airmovebrText,
      centerTitle: false,
      elevation: 0,
      titleTextStyle: TextStyle(
        color: airmovebrText,
        fontSize: 22,
        fontWeight: FontWeight.w900,
      ),
    ),
    scaffoldBackgroundColor: airmovebrSurface,
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
      border: _inputBorder(airmovebrBorder, width: 2),
      enabledBorder: _inputBorder(airmovebrBorder, width: 2),
      focusedBorder: _inputBorder(airmovebrAccent, width: 2.5),
      labelStyle: const TextStyle(
        color: airmovebrMuted,
        fontWeight: FontWeight.w700,
        fontSize: 14,
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(54),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
        side: const BorderSide(color: airmovebrBorder),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    useMaterial3: true,
  );
}

OutlineInputBorder _inputBorder(Color color, {double width = 1}) {
  return OutlineInputBorder(
    borderRadius: BorderRadius.circular(14),
    borderSide: BorderSide(color: color, width: width),
  );
}
