import 'dart:convert';
import 'dart:io';

import 'package:airmovebr_mobile/src/auth/api_login_gateway.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('ApiLoginGateway envia login curto como identificador', () async {
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    Map<String, dynamic>? payload;
    final subscription = server.listen((request) async {
      payload =
          jsonDecode(await utf8.decoder.bind(request).join())
              as Map<String, dynamic>;
      request.response.headers.contentType = ContentType.json;
      request.response.write(
        jsonEncode({
          'access_token': 'token-teste',
          'usuario': {'nome': 'Joao Tecnico'},
        }),
      );
      await request.response.close();
    });

    final gateway = ApiLoginGateway(
      baseUrl: Uri.parse('http://${server.address.host}:${server.port}'),
    );
    final session = await gateway.login('tecnico', '123456');

    expect(session, isNotNull);
    expect(session?.technicianName, 'Joao Tecnico');
    expect(payload, {'login': 'tecnico', 'senha': '123456'});

    await subscription.cancel();
    await server.close(force: true);
  });
}
