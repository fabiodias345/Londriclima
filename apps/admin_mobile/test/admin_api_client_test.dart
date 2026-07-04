import 'dart:io';

import 'package:clima_admin_mobile/src/services/admin_api_client.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('downloadBytes envia token e retorna metadados do PDF', () async {
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    final requestFuture = server.first.then((request) async {
      expect(
        request.headers.value(HttpHeaders.authorizationHeader),
        'Bearer access-token',
      );
      request.response.headers.set(
        'content-disposition',
        'attachment; filename="pmoc-cliente.pdf"',
      );
      request.response.add(<int>[0x25, 0x50, 0x44, 0x46]);
      await request.response.close();
    });

    final client = AdminApiClient(
      baseUrl: Uri.parse('http://${server.address.host}:${server.port}'),
    );
    const session = AdminSession(
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      userName: 'Admin',
      email: 'admin@test.local',
    );

    final file = await client.downloadBytes(
      '/admin/pmoc/clientes/1/pdf',
      session,
    );

    expect(file.bytes, <int>[0x25, 0x50, 0x44, 0x46]);
    expect(file.filename, 'pmoc-cliente.pdf');
    await requestFuture;
    await server.close(force: true);
  });
}
