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
              'checklist_tipo': 'semestral',
              'checklist': [
                {
                  'codigo': 'M1',
                  'item': 'Desligar pelo controle remoto',
                  'tipo': 'checkbox',
                },
                {
                  'codigo': 'S6',
                  'item': 'Pressao do fluido refrigerante',
                  'tipo': 'numerico',
                  'unidade': 'bar/psi',
                },
              ],
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
    expect(orders.single.checklistType, 'semestral');
    expect(orders.single.checklist.length, 2);
    expect(orders.single.checklist.last.code, 'S6');
    expect(orders.single.checklist.last.kind, 'numerico');
    expect(orders.single.checklist.last.unit, 'bar/psi');
    expect(orders.single.equipments.single.name, 'Evaporadora API');

    await pump.cancel();
    await server.close(force: true);
  });

  test('ApiWorkOrderRepository envia checklist preenchido para API', () async {
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    late Map<String, dynamic> payload;
    late HttpRequest capturedRequest;

    final pump = server.listen((request) async {
      capturedRequest = request;
      final body = await request.fold<List<int>>(
        <int>[],
        (previous, element) => previous..addAll(element),
      );
      payload = jsonDecode(utf8.decode(body)) as Map<String, dynamic>;
      request.response.statusCode = HttpStatus.created;
      await request.response.close();
    });

    final repository = ApiWorkOrderRepository(
      baseUrl: Uri.parse('http://127.0.0.1:${server.port}'),
      token: 'token-api',
    );

    await repository.saveChecklist(
      WorkOrder(
        id: 'os-1',
        clientName: 'Cliente API',
        address: 'Rua API, 10',
        equipment: 'Split API',
        maintenanceType: 'PMOC',
        checklistType: 'semestral',
        scheduledAt: DateTime.now(),
        status: WorkOrderStatus.inProgress,
      ),
      equipmentId: 'eq-1',
      checklistType: 'semestral',
      responses: const [
        WorkOrderChecklistResponse(code: 'M1', kind: 'checkbox', value: 'true'),
        WorkOrderChecklistResponse(
          code: 'S6',
          kind: 'numerico',
          value: '7.5',
          note: 'pressao ok',
        ),
      ],
    );

    expect(capturedRequest.method, 'POST');
    expect(capturedRequest.uri.path, '/api/v1/os/os-1/checklist');
    expect(
      capturedRequest.headers.value(HttpHeaders.authorizationHeader),
      'Bearer token-api',
    );
    expect(payload['equipamento_id'], 'eq-1');
    expect(payload['checklist_tipo'], 'semestral');
    expect(payload['servico_realizado'], 'Checklist da maquina');
    expect(payload['procedimentos'], ['M1', 'S6']);
    expect(payload['respostas'], [
      {'codigo': 'M1', 'tipo': 'checkbox', 'valor': 'true'},
      {
        'codigo': 'S6',
        'tipo': 'numerico',
        'valor': '7.5',
        'observacao': 'pressao ok',
      },
    ]);

    await pump.cancel();
    await server.close(force: true);
  });

  test('ApiWorkOrderRepository envia foto de checklist para API', () async {
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    late HttpRequest capturedRequest;
    late String body;

    final pump = server.listen((request) async {
      capturedRequest = request;
      final bytes = await request.fold<List<int>>(
        <int>[],
        (previous, element) => previous..addAll(element),
      );
      body = latin1.decode(bytes);
      request.response.headers.contentType = ContentType.json;
      request.response.write(
        jsonEncode({
          'storage_url': '/storage/os/os-1/checklist/eq-1/M4.jpg',
        }),
      );
      await request.response.close();
    });

    final repository = ApiWorkOrderRepository(
      baseUrl: Uri.parse('http://127.0.0.1:${server.port}'),
      token: 'token-api',
    );

    final storageUrl = await repository.saveChecklistPhoto(
      WorkOrder(
        id: 'os-1',
        clientName: 'Cliente API',
        address: 'Rua API, 10',
        equipment: 'Split API',
        maintenanceType: 'PMOC',
        scheduledAt: DateTime.now(),
        status: WorkOrderStatus.inProgress,
      ),
      equipmentId: 'eq-1',
      code: 'M4',
      photo: const ChecklistPhotoFile(
        filename: 'filtro.jpg',
        mimeType: 'image/jpeg',
        bytes: [1, 2, 3],
      ),
    );

    expect(capturedRequest.method, 'POST');
    expect(capturedRequest.uri.path, '/api/v1/os/os-1/checklist/fotos');
    expect(
      capturedRequest.headers.value(HttpHeaders.authorizationHeader),
      'Bearer token-api',
    );
    expect(
      capturedRequest.headers.contentType?.mimeType,
      'multipart/form-data',
    );
    expect(body, contains('name="equipamento_id"'));
    expect(body, contains('eq-1'));
    expect(body, contains('name="codigo"'));
    expect(body, contains('M4'));
    expect(body, contains('name="foto"; filename="filtro.jpg"'));
    expect(storageUrl, '/storage/os/os-1/checklist/eq-1/M4.jpg');

    await pump.cancel();
    await server.close(force: true);
  });
}
