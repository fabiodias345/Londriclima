import 'package:flutter/material.dart';

import 'auth/hybrid_login_gateway.dart';
import 'screens/login_screen.dart';
import 'services/barcode_scanner_service.dart';
import 'services/location_service.dart';
import 'theme/app_theme.dart';

class AirmovebrApp extends StatelessWidget {
  const AirmovebrApp({super.key});

  static const _apiBaseUrl = String.fromEnvironment('MOBILE_API_BASE_URL');

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'AIRMOVEBR',
      theme: buildAirmovebrTheme(),
      home: LoginScreen(
        loginGateway: HybridLoginGateway(apiBaseUrl: _parseApiBaseUrl()),
        locationService: const DeviceLocationService(),
        barcodeScanner: const DeviceBarcodeScannerService(),
      ),
    );
  }

  Uri? _parseApiBaseUrl() {
    if (_apiBaseUrl.trim().isEmpty) {
      return null;
    }

    return Uri.parse(_apiBaseUrl);
  }
}
