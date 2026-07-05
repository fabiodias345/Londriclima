import 'package:flutter/material.dart';

import 'services/admin_api_client.dart';
import 'services/admin_biometric_auth_service.dart';
import 'services/admin_refresh_token_store.dart';
import 'theme/admin_theme.dart';
import 'screens/login_screen.dart';

const _apiBaseUrl = String.fromEnvironment(
  'ADMIN_API_BASE_URL',
  defaultValue: 'https://api.airmovebr.com.br',
);

class ClimaAdminApp extends StatelessWidget {
  const ClimaAdminApp({
    super.key,
    this.apiClient,
    this.biometricAuth = const DeviceAdminBiometricAuthService(),
    this.refreshTokenStore = const SecureAdminRefreshTokenStore(),
  });

  final AdminApiClient? apiClient;
  final AdminBiometricAuthService biometricAuth;
  final AdminRefreshTokenStore refreshTokenStore;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Clima Admin',
      debugShowCheckedModeBanner: false,
      theme: buildAdminTheme(),
      home: LoginScreen(
        apiClient: apiClient ?? AdminApiClient(baseUrl: Uri.parse(_apiBaseUrl)),
        biometricAuth: biometricAuth,
        refreshTokenStore: refreshTokenStore,
      ),
    );
  }
}
