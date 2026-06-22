import 'package:flutter/material.dart';

const airmovebrPrimary = Color(0xFF073A55);
const airmovebrAccent = Color(0xFF12B7D6);
const airmovebrSurface = Color(0xFFF3F8FA);
const airmovebrText = Color(0xFF061C2A);
const airmovebrMuted = Color(0xFF58707C);
const airmovebrBorder = Color(0xFFD6E5EB);

ThemeData buildAirmovebrTheme() {
  return ThemeData(
    colorScheme: ColorScheme.fromSeed(
      seedColor: airmovebrPrimary,
      primary: airmovebrPrimary,
      secondary: airmovebrAccent,
    ),
    scaffoldBackgroundColor: airmovebrSurface,
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: _inputBorder(airmovebrBorder),
      enabledBorder: _inputBorder(airmovebrBorder),
      focusedBorder: _inputBorder(airmovebrAccent, width: 2),
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
