import 'dart:convert';
import 'dart:io';

import 'package:airmovebr_mobile/src/models/work_order.dart';
import 'package:airmovebr_mobile/src/repositories/api_work_order_repository.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('ApiWorkOrderRepository aceita data nula e status do backend', () async {
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    final requests = <HttpRequest>[];

    final pump = server.listen((request) async {
      requests.add(request);
      request.response.headers.contentType = ContentType.json;
      request.response.write(
        jsonEncode({
          'items': [
            {
              'id': 'os-1',
              'cliente': 'Cliente API',
              'endereco': 'Rua API, 10',
              'equipamento': 'Split API',
              'tipo': 'Limpeza de filtros',
              'data': null,
              'status': 'em_atendimento',
              'equipamentos': [
                {
                  'id': 'eq-1',
                  'nome': 'Evaporadora API',
                  'local': 'Sala API',
                  'modelo': 'Split API',
                },
              ],
            },
          ],
        }),
      );
      await request.response.close();
    });

    final repository = ApiWorkOrderRepository(
      baseUrl: Uri.parse('http://127.0.0.1:${server.port}'),
      token: 'token-api',
    );

    final orders = await repository.listMine();

    expect(
      requests.single.headers.value(HttpHeaders.authorizationHeader),
      'Bearer token-api',
    );
    expect(orders.single.clientName, 'Cliente API');
    expect(orders.single.status, WorkOrderStatus.inProgress);
    expect(orders.single.equipments.single.name, 'Evaporadora API');

    await pump.cancel();
    await server.close(force: true);
  });
}
