import 'dart:convert';
import 'dart:io';

import 'package:airmovebr_mobile/src/models/work_order.dart';
import 'package:airmovebr_mobile/src/repositories/api_work_order_repository.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('finalizacao envia nome e assinatura do tecnico', () async {
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    addTearDown(() => server.close(force: true));
    late Map<String, dynamic> payload;
    final responseFuture = server.first.then((request) async {
      payload =
          jsonDecode(await utf8.decoder.bind(request).join())
              as Map<String, dynamic>;
      request.response
        ..statusCode = HttpStatus.ok
        ..headers.contentType = ContentType.json
        ..write('{"status":"concluida"}');
      await request.response.close();
    });
    final repository = ApiWorkOrderRepository(
      baseUrl: Uri.parse('http://${server.address.host}:${server.port}'),
      token: 'token',
    );
    final order = WorkOrder(
      id: 'os-1',
      clientName: 'Cliente',
      address: 'Rua Teste',
      equipment: 'Camara fria',
      maintenanceType: 'Preventiva',
      scheduledAt: DateTime.utc(2026, 7, 2),
      status: WorkOrderStatus.inProgress,
      backendStatus: 'em_atendimento',
    );

    await repository.finishWorkOrder(
      order,
      FinalizeWorkOrderInput(
        signatureBase64: 'cliente-base64',
        responsibleName: 'Maria Souza',
        technicianSignatureBase64: 'tecnico-base64',
        technicianName: 'Joao Tecnico',
        latitude: -23.3,
        longitude: -51.1,
        finalizedAt: DateTime.utc(2026, 7, 2, 18),
      ),
    );
    await responseFuture;

    expect(payload['assinatura_tecnico_base64'], 'tecnico-base64');
    expect(payload['nome_tecnico_assinatura'], 'Joao Tecnico');
  });
}
