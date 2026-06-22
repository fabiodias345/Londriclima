import 'dart:convert';
import 'dart:io';

import '../repositories/api_work_order_repository.dart';
import 'mobile_login_gateway.dart';

class ApiLoginGateway implements MobileLoginGateway {
  const ApiLoginGateway({required this.baseUrl});

  final Uri baseUrl;

  @override
  Future<LoginSession?> login(String user, String password) async {
    final client = HttpClient();

    try {
      final request = await client.postUrl(
        baseUrl.resolve('/api/v1/auth/login'),
      );
      request.headers.contentType = ContentType.json;
      request.write(jsonEncode({'email': user.trim(), 'senha': password}));

      final response = await request.close();
      final body = await response.transform(utf8.decoder).join();

      if (response.statusCode < 200 || response.statusCode >= 300) {
        return null;
      }

      final decoded = jsonDecode(body) as Map<String, dynamic>;
      final token = decoded['access_token']?.toString();
      if (token == null || token.isEmpty) {
        return null;
      }

      return LoginSession(
        repository: ApiWorkOrderRepository(baseUrl: baseUrl, token: token),
      );
    } finally {
      client.close(force: true);
    }
  }
}
