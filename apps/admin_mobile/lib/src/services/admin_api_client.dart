import 'dart:async';
import 'dart:convert';
import 'dart:io';

class AdminSession {
  const AdminSession({
    required this.accessToken,
    required this.refreshToken,
    required this.userName,
    required this.email,
  });

  final String accessToken;
  final String refreshToken;
  final String userName;
  final String email;
}

enum AdminLoginFailure {
  invalidCredentials,
  firstAccessRequired,
  forbiddenRole,
  network,
  unexpected,
}

class AdminLoginException implements Exception {
  const AdminLoginException(this.failure);

  final AdminLoginFailure failure;
}

class AdminApiClient {
  const AdminApiClient({
    required this.baseUrl,
    this.timeout = const Duration(seconds: 10),
  });

  final Uri baseUrl;
  final Duration timeout;

  Future<AdminSession> login(String login, String password) async {
    final client = HttpClient()..connectionTimeout = timeout;

    try {
      final request = await client
          .postUrl(baseUrl.resolve('/api/v1/auth/login'))
          .timeout(timeout);
      request.headers.contentType = ContentType.json;
      request.write(jsonEncode({'login': login.trim(), 'senha': password}));

      final response = await request.close().timeout(timeout);
      final body = await response.transform(utf8.decoder).join().timeout(timeout);

      if (response.statusCode == 401) {
        throw const AdminLoginException(AdminLoginFailure.invalidCredentials);
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw const AdminLoginException(AdminLoginFailure.unexpected);
      }

      final decoded = jsonDecode(body) as Map<String, dynamic>;
      if (decoded['onboarding_required'] == true) {
        throw const AdminLoginException(AdminLoginFailure.firstAccessRequired);
      }

      final usuario = decoded['usuario'] as Map<String, dynamic>?;
      final role = usuario?['role']?.toString();
      if (role != 'admin') {
        throw const AdminLoginException(AdminLoginFailure.forbiddenRole);
      }

      final accessToken = decoded['access_token']?.toString() ?? '';
      final refreshToken = decoded['refresh_token']?.toString() ?? '';
      if (accessToken.isEmpty || refreshToken.isEmpty) {
        throw const AdminLoginException(AdminLoginFailure.unexpected);
      }

      return AdminSession(
        accessToken: accessToken,
        refreshToken: refreshToken,
        userName: usuario?['nome']?.toString() ?? 'Administrador',
        email: usuario?['email']?.toString() ?? '',
      );
    } on AdminLoginException {
      rethrow;
    } on SocketException {
      throw const AdminLoginException(AdminLoginFailure.network);
    } on TimeoutException {
      throw const AdminLoginException(AdminLoginFailure.network);
    } on FormatException {
      throw const AdminLoginException(AdminLoginFailure.unexpected);
    } finally {
      client.close(force: true);
    }
  }
}
