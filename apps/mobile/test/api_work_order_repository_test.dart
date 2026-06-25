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
              'tipo_servico': 'corretiva',
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
    expect(orders.single.serviceType, 'corretiva');
    expect(orders.single.serviceLabel, 'Corretiva');
    expect(orders.single.checklistType, 'semestral');
    expect(orders.single.checklist.length, 2);
    expect(orders.single.checklist.last.code, 'S6');
    expect(orders.single.checklist.last.kind, 'numerico');
    expect(orders.single.checklist.last.unit, 'bar/psi');
    expect(orders.single.equipments.single.name, 'Evaporadora API');

    await pump.cancel();
    await server.close(force: true);
  });

  test(
    'ApiWorkOrderRepository le status de execucao por equipamento',
    () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);

      final pump = server.listen((request) async {
        request.response.headers.contentType = ContentType.json;
        request.response.write(
          jsonEncode({
            'items': [
              {
                'id': 'os-1',
                'cliente': 'Cliente API',
                'endereco': 'Rua API, 10',
                'equipamento': 'Todos',
                'tipo': 'PMOC',
                'data': null,
                'status': 'em_atendimento',
                'equipamentos': [
                  {
                    'id': 'eq-1',
                    'nome': 'Sala 1',
                    'local': 'Sala 1',
                    'modelo': 'Split',
                    'status_execucao': 'feito',
                  },
                  {
                    'id': 'eq-2',
                    'nome': 'Sala 2',
                    'local': 'Sala 2',
                    'modelo': 'Split',
                    'status_execucao': 'pendente',
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

      expect(orders.single.equipments[0].executionStatus, 'feito');
      expect(orders.single.equipments[0].isDone, isTrue);
      expect(orders.single.equipments[1].executionStatus, 'pendente');

      await pump.cancel();
      await server.close(force: true);
    },
  );

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
        WorkOrderChecklistResponse(code: 'M1', kind: 'checkbox', value: 'Sim'),
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
      {'codigo': 'M1', 'tipo': 'checkbox', 'valor': 'Sim'},
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
        jsonEncode({'storage_url': '/storage/os/os-1/checklist/eq-1/M4.jpg'}),
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

  test(
    'ApiWorkOrderRepository mostra erro real ao falhar foto de checklist',
    () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);

      final pump = server.listen((request) async {
        await request.drain<void>();
        request.response.statusCode = HttpStatus.badRequest;
        request.response.headers.contentType = ContentType.json;
        request.response.write(
          jsonEncode({'message': 'Foto excede o limite de 3 MB.'}),
        );
        await request.response.close();
      });

      final repository = ApiWorkOrderRepository(
        baseUrl: Uri.parse('http://127.0.0.1:${server.port}'),
        token: 'token-api',
      );

      await expectLater(
        repository.saveChecklistPhoto(
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
        ),
        throwsA(
          isA<HttpException>().having(
            (error) => error.message,
            'message',
            contains('Foto excede o limite de 3 MB.'),
          ),
        ),
      );

      await pump.cancel();
      await server.close(force: true);
    },
  );

  test(
    'ApiWorkOrderRepository ignora conflito quando foto antes ja existe',
    () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);

      final pump = server.listen((request) async {
        await request.drain<void>();
        request.response.statusCode = HttpStatus.conflict;
        request.response.headers.contentType = ContentType.json;
        request.response.write(
          jsonEncode({
            'message': 'Evidencia inicial ja registrada para esta OS.',
          }),
        );
        await request.response.close();
      });

      final repository = ApiWorkOrderRepository(
        baseUrl: Uri.parse('http://127.0.0.1:${server.port}'),
        token: 'token-api',
      );

      await repository.saveInitialEvidence(
        WorkOrder(
          id: 'os-1',
          clientName: 'Cliente API',
          address: 'Rua API, 10',
          equipment: 'Split API',
          maintenanceType: 'PMOC',
          scheduledAt: DateTime.now(),
          status: WorkOrderStatus.inProgress,
        ),
        description: 'Foto antes',
        photo: const ChecklistPhotoFile(
          filename: 'antes.jpg',
          mimeType: 'image/jpeg',
          bytes: [1, 2, 3],
        ),
      );

      await pump.cancel();
      await server.close(force: true);
    },
  );

  test(
    'ApiWorkOrderRepository ignora conflito quando foto depois ja existe',
    () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);

      final pump = server.listen((request) async {
        await request.drain<void>();
        request.response.statusCode = HttpStatus.conflict;
        request.response.headers.contentType = ContentType.json;
        request.response.write(
          jsonEncode({
            'message': 'Evidência final já registrada para esta OS.',
          }),
        );
        await request.response.close();
      });

      final repository = ApiWorkOrderRepository(
        baseUrl: Uri.parse('http://127.0.0.1:${server.port}'),
        token: 'token-api',
      );

      await repository.saveFinalEvidence(
        WorkOrder(
          id: 'os-1',
          clientName: 'Cliente API',
          address: 'Rua API, 10',
          equipment: 'Split API',
          maintenanceType: 'PMOC',
          scheduledAt: DateTime.now(),
          status: WorkOrderStatus.inProgress,
        ),
        description: 'Foto depois',
        photo: const ChecklistPhotoFile(
          filename: 'depois.jpg',
          mimeType: 'image/jpeg',
          bytes: [1, 2, 3],
        ),
      );

      await pump.cancel();
      await server.close(force: true);
    },
  );

  test('ApiWorkOrderRepository envia evidencias e finaliza OS', () async {
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    final paths = <String>[];
    final bodies = <String>[];
    late Map<String, dynamic> finishPayload;

    final pump = server.listen((request) async {
      paths.add(request.uri.path);
      final bytes = await request.fold<List<int>>(
        <int>[],
        (previous, element) => previous..addAll(element),
      );
      final body = latin1.decode(bytes);
      bodies.add(body);

      if (request.uri.path.endsWith('/finalizar')) {
        finishPayload = jsonDecode(body) as Map<String, dynamic>;
      }

      request.response.headers.contentType = ContentType.json;
      request.response.write('{}');
      await request.response.close();
    });

    final repository = ApiWorkOrderRepository(
      baseUrl: Uri.parse('http://127.0.0.1:${server.port}'),
      token: 'token-api',
    );
    final order = WorkOrder(
      id: 'os-1',
      clientName: 'Cliente API',
      address: 'Rua API, 10',
      equipment: 'Split API',
      maintenanceType: 'PMOC',
      scheduledAt: DateTime.now(),
      status: WorkOrderStatus.inProgress,
    );

    await repository.saveInitialEvidence(
      order,
      description: 'antes',
      photo: const ChecklistPhotoFile(
        filename: 'antes.jpg',
        mimeType: 'image/jpeg',
        bytes: [1, 2, 3],
      ),
    );
    await repository.saveFinalEvidence(
      order,
      description: 'depois',
      photo: const ChecklistPhotoFile(
        filename: 'depois.jpg',
        mimeType: 'image/jpeg',
        bytes: [4, 5, 6],
      ),
    );
    final updated = await repository.finishWorkOrder(
      order,
      FinalizeWorkOrderInput(
        signatureBase64: 'data:image/png;base64,abc',
        responsibleName: 'Cliente Teste',
        latitude: -23.3048,
        longitude: -51.1701,
        finalizedAt: DateTime.parse('2026-06-22T10:00:00Z'),
      ),
    );

    expect(paths, [
      '/api/v1/os/os-1/evidencia-inicial',
      '/api/v1/os/os-1/evidencia-final',
      '/api/v1/os/os-1/finalizar',
    ]);
    expect(bodies[0], contains('name="descricao_antes"'));
    expect(bodies[0], contains('name="foto_antes"; filename="antes.jpg"'));
    expect(bodies[1], contains('name="descricao_depois"'));
    expect(bodies[1], contains('name="foto_depois"; filename="depois.jpg"'));
    expect(
      finishPayload['assinatura_cliente_base64'],
      startsWith('data:image/png;base64,'),
    );
    expect(finishPayload['nome_responsavel_assinatura'], 'Cliente Teste');
    expect(finishPayload['latitude'], -23.3048);
    expect(finishPayload['longitude'], -51.1701);
    expect(updated.status, WorkOrderStatus.done);
    expect(updated.backendStatus, 'concluida');

    await pump.cancel();
    await server.close(force: true);
  });

  test(
    'ApiWorkOrderRepository mostra mensagem real quando finalizar falha',
    () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);

      final pump = server.listen((request) async {
        await request.drain<void>();
        request.response.statusCode = HttpStatus.badRequest;
        request.response.headers.contentType = ContentType.json;
        request.response.write(
          jsonEncode({'message': 'Checklist obrigatorio'}),
        );
        await request.response.close();
      });

      final repository = ApiWorkOrderRepository(
        baseUrl: Uri.parse('http://127.0.0.1:${server.port}'),
        token: 'token-api',
      );
      final order = WorkOrder(
        id: 'os-1',
        clientName: 'Cliente API',
        address: 'Rua API, 10',
        equipment: 'Split API',
        maintenanceType: 'PMOC',
        scheduledAt: DateTime.now(),
        status: WorkOrderStatus.inProgress,
      );

      await expectLater(
        repository.finishWorkOrder(
          order,
          FinalizeWorkOrderInput(
            signatureBase64: 'data:image/png;base64,abc',
            responsibleName: 'Cliente Teste',
            latitude: -23.3048,
            longitude: -51.1701,
            finalizedAt: DateTime.parse('2026-06-22T10:00:00Z'),
          ),
        ),
        throwsA(
          isA<HttpException>().having(
            (error) => error.message,
            'message',
            contains('Checklist obrigatorio'),
          ),
        ),
      );

      await pump.cancel();
      await server.close(force: true);
    },
  );
}
