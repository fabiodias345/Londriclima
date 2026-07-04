import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import '../repositories/api_work_order_repository.dart';
import '../repositories/api_fleet_repository.dart';
import '../repositories/offline_work_order_repository.dart';
import 'onboarding_required_exception.dart';
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
      if (decoded['onboarding_required'] == true) {
        final onboardingToken = decoded['onboarding_token']?.toString() ?? '';
        final technicianName =
            (decoded['usuario'] as Map<String, dynamic>?)?['nome']
                ?.toString() ??
            '';

        if (onboardingToken.isNotEmpty) {
          throw OnboardingRequiredException(
            onboardingToken: onboardingToken,
            technicianName: technicianName,
          );
        }
      }

      final token = decoded['access_token']?.toString();
      if (token == null || token.isEmpty) {
        return null;
      }

      return LoginSession(
        repository: OfflineWorkOrderRepository(
          remote: ApiWorkOrderRepository(baseUrl: baseUrl, token: token),
        ),
        fleetRepository: ApiFleetRepository(baseUrl: baseUrl, token: token),
        technicianName:
            (decoded['usuario'] as Map<String, dynamic>?)?['nome']
                ?.toString() ??
            '',
      );
    } finally {
      client.close(force: true);
    }
  }

  @override
  Future<LoginSession?> completeFirstAccess(FirstAccessRegistration registration) async {
    final client = HttpClient()..connectionTimeout = timeout;

    try {
      final request = await client
          .postUrl(baseUrl.resolve('/api/v1/auth/primeiro-acesso'))
          .timeout(timeout);
      final boundary = 'airmovebr-${DateTime.now().microsecondsSinceEpoch}';
      final body = _multipartBody(boundary, registration);
      request.headers.set('Content-Type', 'multipart/form-data; boundary=$boundary');
      request.contentLength = body.length;
      request.add(body);

      final response = await request.close().timeout(timeout);
      final responseBody = await response.transform(utf8.decoder).join().timeout(timeout);

      if (response.statusCode < 200 || response.statusCode >= 300) {
        return null;
      }

      final decoded = jsonDecode(responseBody) as Map<String, dynamic>;
      final token = decoded['access_token']?.toString();
      if (token == null || token.isEmpty) {
        return null;
      }

      return LoginSession(
        repository: OfflineWorkOrderRepository(
          remote: ApiWorkOrderRepository(baseUrl: baseUrl, token: token),
        ),
        fleetRepository: ApiFleetRepository(baseUrl: baseUrl, token: token),
        technicianName:
            (decoded['usuario'] as Map<String, dynamic>?)?['nome']
                ?.toString() ??
            '',
      );
    } finally {
      client.close(force: true);
    }
  }

  @override
  Future<bool> validateTechnicianInvite(String code) async {
    final client = HttpClient()..connectionTimeout = timeout;
    try {
      final request = await client.postUrl(baseUrl.resolve('/api/v1/auth/convite-tecnico/validar')).timeout(timeout);
      request.headers.contentType = ContentType.json;
      request.write(jsonEncode({'codigo': code.trim()}));
      final response = await request.close().timeout(timeout);
      await response.drain<void>();
      return response.statusCode >= 200 && response.statusCode < 300;
    } finally {
      client.close(force: true);
    }
  }

  @override
  Future<LoginSession?> registerWithTechnicianInvite(TechnicianInviteRegistration registration) async {
    final client = HttpClient()..connectionTimeout = timeout;
    try {
      final request = await client.postUrl(baseUrl.resolve('/api/v1/auth/cadastro-convite')).timeout(timeout);
      final boundary = 'airmovebr-${DateTime.now().microsecondsSinceEpoch}';
      final body = _inviteMultipartBody(boundary, registration);
      request.headers.set('Content-Type', 'multipart/form-data; boundary=$boundary');
      request.contentLength = body.length;
      request.add(body);
      final response = await request.close().timeout(timeout);
      final responseBody = await response.transform(utf8.decoder).join().timeout(timeout);
      if (response.statusCode < 200 || response.statusCode >= 300) return null;
      final decoded = jsonDecode(responseBody) as Map<String, dynamic>;
      final token = decoded['access_token']?.toString();
      if (token == null || token.isEmpty) return null;
      return LoginSession(
        repository: OfflineWorkOrderRepository(remote: ApiWorkOrderRepository(baseUrl: baseUrl, token: token)),
        fleetRepository: ApiFleetRepository(baseUrl: baseUrl, token: token),
        technicianName: (decoded['usuario'] as Map<String, dynamic>?)?['nome']?.toString() ?? '',
      );
    } finally {
      client.close(force: true);
    }
  }

  List<int> _multipartBody(String boundary, FirstAccessRegistration registration) {
    final output = BytesBuilder(copy: false);
    void line(String value) => output.add(utf8.encode('$value\r\n'));
    void field(String name, String value) {
      line('--$boundary');
      line('Content-Disposition: form-data; name="$name"');
      line('');
      line(value);
    }
    void file(String name, String filename, String mimeType, List<int> bytes) {
      line('--$boundary');
      line('Content-Disposition: form-data; name="$name"; filename="$filename"');
      line('Content-Type: $mimeType');
      line('');
      output.add(bytes);
      line('');
    }

    field('onboarding_token', registration.onboardingToken);
    field('senha', registration.password);
    field('nome', registration.name);
    field('cpf', registration.cpf);
    field('telefone', registration.phone);
    field('termo_aceito', registration.termAccepted.toString());
    file('foto', registration.photo.filename, registration.photo.mimeType, registration.photo.bytes);
    file('assinatura', 'assinatura.png', 'image/png', registration.signaturePng);
    line('--$boundary--');
    return output.takeBytes();
  }

  List<int> _inviteMultipartBody(String boundary, TechnicianInviteRegistration registration) {
    final output = BytesBuilder(copy: false);
    void line(String value) => output.add(utf8.encode('$value\r\n'));
    void field(String name, String value) {
      line('--$boundary');
      line('Content-Disposition: form-data; name="$name"');
      line('');
      line(value);
    }
    void file(String name, String filename, String mimeType, List<int> bytes) {
      line('--$boundary');
      line('Content-Disposition: form-data; name="$name"; filename="$filename"');
      line('Content-Type: $mimeType');
      line('');
      output.add(bytes);
      line('');
    }
    field('codigo', registration.code);
    field('senha', registration.password);
    field('nome', registration.name);
    field('login', registration.login);
    field('email', registration.email);
    field('cpf', registration.cpf);
    field('telefone', registration.phone);
    field('termo_aceito', registration.termAccepted.toString());
    file('foto', registration.photo.filename, registration.photo.mimeType, registration.photo.bytes);
    file('assinatura', 'assinatura.png', 'image/png', registration.signaturePng);
    line('--$boundary--');
    return output.takeBytes();
  }
}
