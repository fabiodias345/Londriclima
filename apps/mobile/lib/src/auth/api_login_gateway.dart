import 'dart:convert';
import 'dart:io';

import '../repositories/api_work_order_repository.dart';
import '../repositories/api_fleet_repository.dart';
import '../repositories/offline_work_order_repository.dart';
import 'mobile_login_gateway.dart';

class ApiLoginGateway implements MobileLoginGateway {
  const ApiLoginGateway({
    required this.baseUrl,
    this.timeout = const Duration(seconds: 8),
  });

  final Uri baseUrl;
  final Duration timeout;

  @override
  Future<LoginSession?> login(String user, String password) async {
    final client = HttpClient()..connectionTimeout = timeout;

    try {
      final request = await client
          .postUrl(baseUrl.resolve('/api/v1/auth/login'))
          .timeout(timeout);
      request.headers.contentType = ContentType.json;
      request.write(jsonEncode({'login': user.trim(), 'senha': password}));

      final response = await request.close().timeout(timeout);
      final body = await response
          .transform(utf8.decoder)
          .join()
          .timeout(timeout);

      if (response.statusCode < 200 || response.statusCode >= 300) {
        return null;
      }

      final decoded = jsonDecode(body) as Map<String, dynamic>;
      final token = decoded['access_token']?.toString();
      if (token == null || token.isEmpty) {
        return null;
      }

      return LoginSession(
        repository: OfflineWorkOrderRepository(
          remote: ApiWorkOrderRepository(baseUrl: baseUrl, token: token),
        ),
        fleetRepository: ApiFleetRepository(baseUrl: baseUrl, token: token),
      );
    } finally {
      client.close(force: true);
    }
  }
}
