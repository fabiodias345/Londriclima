import 'package:flutter/material.dart';

const adminInk = Color(0xFF071421);
const adminBlue = Color(0xFF0B4D89);
const adminCyan = Color(0xFF12A8C8);
const adminGreen = Color(0xFF16A66A);
const adminOrange = Color(0xFFF29F24);
const adminRed = Color(0xFFE04B42);
const adminPurple = Color(0xFF7048C9);
const adminSlate = Color(0xFF64748B);
const adminSurface = Color(0xFFF5F7FA);
const adminBorder = Color(0xFFDCE3EA);

ThemeData buildAdminTheme() {
  return ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: adminBlue,
      primary: adminBlue,
      secondary: adminCyan,
      surface: Colors.white,
    ),
    scaffoldBackgroundColor: adminSurface,
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: adminInk,
      elevation: 0,
      centerTitle: false,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: adminBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: adminBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: adminBlue, width: 1.5),
      ),
    ),
  );
}
