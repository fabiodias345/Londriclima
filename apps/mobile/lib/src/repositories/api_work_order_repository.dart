import 'dart:convert';
import 'dart:io';

import '../models/work_order.dart';
import '../services/location_service.dart';
import 'work_order_repository.dart';

class ApiWorkOrderRepository implements WorkOrderRepository {
  ApiWorkOrderRepository({required this.baseUrl, required this.token});

  final Uri baseUrl;
  final String token;

  @override
  Future<List<WorkOrder>> listMine() async {
    final uri = baseUrl.resolve('/api/v1/mobile/os');
    final client = HttpClient();

    try {
      final request = await client.getUrl(uri);
      request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      final response = await request.close();
      final body = await response.transform(utf8.decoder).join();

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw HttpException(
          'Falha ao carregar OS mobile: ${response.statusCode}',
        );
      }

      final decoded = jsonDecode(body);
      final items = decoded is List ? decoded : decoded['items'] as List;
      return items
          .map((item) => _fromJson(item as Map<String, dynamic>))
          .toList();
    } finally {
      client.close(force: true);
    }
  }

  @override
  Future<WorkOrder> startService(WorkOrder order, GeoPoint location) async {
    return _updateStatus(
      order: order,
      location: location,
      action: 'iniciar_atendimento',
      fallbackStatus: 'em_atendimento',
      errorPrefix: 'Falha ao iniciar atendimento',
    );
  }

  @override
  Future<WorkOrder> arriveAtClient(WorkOrder order, GeoPoint location) async {
    return _updateStatus(
      order: order,
      location: location,
      action: 'cheguei_cliente',
      fallbackStatus: 'em_atendimento',
      errorPrefix: 'Falha ao chegar no cliente',
    );
  }

  @override
  Future<void> saveChecklist(
    WorkOrder order, {
    required String equipmentId,
    required String checklistType,
    required List<WorkOrderChecklistResponse> responses,
  }) async {
    final uri = baseUrl.resolve('/api/v1/os/${order.id}/checklist');
    final client = HttpClient();

    try {
      final request = await client.postUrl(uri);
      request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      request.headers.contentType = ContentType.json;
      request.write(
        jsonEncode({
          'equipamento_id': equipmentId,
          'checklist_tipo': checklistType,
          'servico_realizado': 'Checklist da maquina',
          'procedimentos': responses.map((response) => response.code).toList(),
          'respostas': responses
              .map(
                (response) => {
                  'codigo': response.code,
                  'tipo': response.kind,
                  'valor': response.value,
                  if (response.note != null && response.note!.isNotEmpty)
                    'observacao': response.note,
                },
              )
              .toList(),
        }),
      );

      final response = await request.close();
      final body = await response.transform(utf8.decoder).join();

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw HttpException(
          _errorMessage(
            body,
            fallback: 'Falha ao salvar checklist: ${response.statusCode}',
          ),
        );
      }
    } finally {
      client.close(force: true);
    }
  }

  @override
  Future<String> saveChecklistPhoto(
    WorkOrder order, {
    required String equipmentId,
    required String code,
    required ChecklistPhotoFile photo,
  }) async {
    final uri = baseUrl.resolve('/api/v1/os/${order.id}/checklist/fotos');
    final client = HttpClient();
    final boundary = 'airmovebr-${DateTime.now().microsecondsSinceEpoch}';

    try {
      final request = await client.postUrl(uri);
      request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      request.headers.set(
        HttpHeaders.contentTypeHeader,
        'multipart/form-data; boundary=$boundary',
      );
      request.add(
        _multipartBody(
          boundary: boundary,
          fields: {'equipamento_id': equipmentId, 'codigo': code},
          fileField: 'foto',
          filename: photo.filename,
          mimeType: photo.mimeType,
          bytes: photo.bytes,
        ),
      );

      final response = await request.close();
      final body = await response.transform(utf8.decoder).join();

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw HttpException(
          _errorMessage(
            body,
            fallback:
                'Falha ao enviar foto do checklist: ${response.statusCode}',
          ),
        );
      }

      final decoded = jsonDecode(body) as Map<String, dynamic>;
      return decoded['storage_url'].toString();
    } finally {
      client.close(force: true);
    }
  }

  @override
  Future<void> saveInitialEvidence(
    WorkOrder order, {
    required String description,
    required ChecklistPhotoFile photo,
  }) async {
    await _saveEvidencePhoto(
      order,
      path: '/api/v1/os/${order.id}/evidencia-inicial',
      descriptionField: 'descricao_antes',
      fileField: 'foto_antes',
      description: description,
      photo: photo,
      errorPrefix: 'Falha ao enviar foto antes',
    );
  }

  @override
  Future<void> saveFinalEvidence(
    WorkOrder order, {
    required String description,
    required ChecklistPhotoFile photo,
  }) async {
    await _saveEvidencePhoto(
      order,
      path: '/api/v1/os/${order.id}/evidencia-final',
      descriptionField: 'descricao_depois',
      fileField: 'foto_depois',
      description: description,
      photo: photo,
      errorPrefix: 'Falha ao enviar foto depois',
    );
  }

  @override
  Future<WorkOrder> finishWorkOrder(
    WorkOrder order,
    FinalizeWorkOrderInput input,
  ) async {
    final uri = baseUrl.resolve('/api/v1/os/${order.id}/finalizar');
    final client = HttpClient();

    try {
      final request = await client.postUrl(uri);
      request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      request.headers.contentType = ContentType.json;
      request.write(
        jsonEncode({
          'assinatura_cliente_base64': input.signatureBase64,
          'nome_responsavel_assinatura': input.responsibleName,
          'latitude': input.latitude,
          'longitude': input.longitude,
          'finalizado_em': input.finalizedAt.toIso8601String(),
        }),
      );

      final response = await request.close();
      final body = await response.transform(utf8.decoder).join();

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw HttpException(
          _errorMessage(
            body,
            fallback: 'Falha ao finalizar OS: ${response.statusCode}',
          ),
        );
      }

      return order.copyWith(
        status: WorkOrderStatus.done,
        backendStatus: 'concluida',
      );
    } finally {
      client.close(force: true);
    }
  }

  @override
  Future<int> pendingSyncCount() async => 0;

  @override
  Future<OfflineSyncResult> syncPending() async => const OfflineSyncResult();

  @override
  Future<WorkOrderEquipment> saveMachineData(
    WorkOrder order,
    MachineDataInput input,
  ) async {
    final uri = baseUrl.resolve(
      '/api/v1/os/${order.id}/identificacao-equipamento',
    );
    final client = HttpClient();

    try {
      final request = await client.putUrl(uri);
      request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      request.headers.contentType = ContentType.json;
      request.write(
        jsonEncode({
          if (input.equipmentId != null) 'equipamento_id': input.equipmentId,
          'codigo_qr': input.qrCode,
          'tipo': input.type,
          'marca': input.brand,
          'modelo': input.model,
          if (input.btus != null) 'capacidade_btu': input.btus,
          'gas_refrigerante': input.gas,
          'numero_serie': input.serialNumber,
          'local_instalacao': input.location,
          'dados_impossiveis': input.impossibleFields.entries
              .map((entry) => {'campo': entry.key, 'observacao': entry.value})
              .toList(),
        }),
      );

      final response = await request.close();
      final body = await response.transform(utf8.decoder).join();

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw HttpException('Falha ao salvar maquina: ${response.statusCode}');
      }

      final decoded = jsonDecode(body) as Map<String, dynamic>;
      return _equipmentFromJson(decoded['equipamento'] as Map<String, dynamic>);
    } finally {
      client.close(force: true);
    }
  }

  List<int> _multipartBody({
    required String boundary,
    required Map<String, String> fields,
    required String fileField,
    required String filename,
    required String mimeType,
    required List<int> bytes,
  }) {
    final body = <int>[];

    void write(String value) {
      body.addAll(utf8.encode(value));
    }

    for (final entry in fields.entries) {
      write('--$boundary\r\n');
      write('Content-Disposition: form-data; name="${entry.key}"\r\n\r\n');
      write('${entry.value}\r\n');
    }

    write('--$boundary\r\n');
    write(
      'Content-Disposition: form-data; name="$fileField"; filename="$filename"\r\n',
    );
    write('Content-Type: $mimeType\r\n\r\n');
    body.addAll(bytes);
    write('\r\n--$boundary--\r\n');

    return body;
  }

  Future<void> _saveEvidencePhoto(
    WorkOrder order, {
    required String path,
    required String descriptionField,
    required String fileField,
    required String description,
    required ChecklistPhotoFile photo,
    required String errorPrefix,
  }) async {
    final uri = baseUrl.resolve(path);
    final client = HttpClient();
    final boundary = 'airmovebr-${DateTime.now().microsecondsSinceEpoch}';

    try {
      final request = await client.postUrl(uri);
      request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      request.headers.set(
        HttpHeaders.contentTypeHeader,
        'multipart/form-data; boundary=$boundary',
      );
      request.add(
        _multipartBody(
          boundary: boundary,
          fields: {descriptionField: description},
          fileField: fileField,
          filename: photo.filename,
          mimeType: photo.mimeType,
          bytes: photo.bytes,
        ),
      );

      final response = await request.close();
      final body = await response.transform(utf8.decoder).join();

      if (response.statusCode < 200 || response.statusCode >= 300) {
        final message = _errorMessage(
          body,
          fallback: '$errorPrefix: ${response.statusCode}',
        );
        if (response.statusCode == HttpStatus.conflict &&
            _isEvidenceAlreadyRegistered(message)) {
          return;
        }
        throw HttpException(message);
      }
    } finally {
      client.close(force: true);
    }
  }

  bool _isEvidenceAlreadyRegistered(String message) {
    final normalized = _normalizeMessage(message);
    return normalized.contains('evidencia') &&
        normalized.contains('registrada');
  }

  String _normalizeMessage(String message) {
    return message
        .toLowerCase()
        .replaceAll(RegExp('[áàâã]'), 'a')
        .replaceAll(RegExp('[éèê]'), 'e')
        .replaceAll(RegExp('[íìî]'), 'i')
        .replaceAll(RegExp('[óòôõ]'), 'o')
        .replaceAll(RegExp('[úùû]'), 'u')
        .replaceAll('ç', 'c');
  }

  Future<WorkOrder> _updateStatus({
    required WorkOrder order,
    required GeoPoint location,
    required String action,
    required String fallbackStatus,
    required String errorPrefix,
  }) async {
    final uri = baseUrl.resolve('/api/v1/os/${order.id}/status');
    final client = HttpClient();

    try {
      final request = await client.patchUrl(uri);
      request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      request.headers.contentType = ContentType.json;
      request.write(
        jsonEncode({
          'acao': action,
          'latitude': location.latitude,
          'longitude': location.longitude,
          'registrado_em': DateTime.now().toIso8601String(),
        }),
      );

      final response = await request.close();
      await response.drain<void>();

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw HttpException('$errorPrefix: ${response.statusCode}');
      }

      return order.copyWith(
        status: WorkOrderStatus.inProgress,
        backendStatus: fallbackStatus,
      );
    } finally {
      client.close(force: true);
    }
  }

  WorkOrder _fromJson(Map<String, dynamic> json) {
    return WorkOrder(
      id: json['id'].toString(),
      clientName: json['cliente']?.toString() ?? json['clientName'].toString(),
      address: json['endereco']?.toString() ?? json['address'].toString(),
      equipment:
          json['equipamento']?.toString() ?? json['equipment'].toString(),
      equipments: _equipmentsFromJson(json),
      maintenanceType:
          json['tipo']?.toString() ?? json['maintenanceType'].toString(),
      checklistType:
          json['checklist_tipo']?.toString() ??
          json['checklistType']?.toString() ??
          'mensal',
      checklist: _checklistFromJson(json),
      scheduledAt: _dateFromJson(json),
      status: _statusFromJson(json['status'].toString()),
      backendStatus: json['status'].toString(),
    );
  }

  List<WorkOrderChecklistItem> _checklistFromJson(Map<String, dynamic> json) {
    final raw = json['checklist'];
    if (raw is! List) {
      return const [];
    }

    return raw.map((item) {
      final map = item as Map<String, dynamic>;
      final rawOptions = map['opcoes'] ?? map['options'];
      return WorkOrderChecklistItem(
        code: map['codigo']?.toString() ?? map['code'].toString(),
        label: map['item']?.toString() ?? map['label'].toString(),
        kind: map['tipo']?.toString() ?? map['kind'].toString(),
        options: rawOptions is List
            ? rawOptions.map((option) => option.toString()).toList()
            : const [],
        unit: map['unidade']?.toString() ?? map['unit']?.toString(),
      );
    }).toList();
  }

  DateTime _dateFromJson(Map<String, dynamic> json) {
    final raw = json['data'] ?? json['scheduledAt'];
    if (raw == null) {
      return DateTime.now();
    }

    return DateTime.parse(raw.toString());
  }

  List<WorkOrderEquipment> _equipmentsFromJson(Map<String, dynamic> json) {
    final raw = json['equipamentos'] ?? json['equipments'];
    if (raw is! List) {
      return const [];
    }

    return raw.map((item) {
      final map = item as Map<String, dynamic>;
      return WorkOrderEquipment(
        id: map['id'].toString(),
        qrCode: map['codigo_qr']?.toString() ?? map['qrCode']?.toString() ?? '',
        type: map['tipo']?.toString() ?? map['type']?.toString() ?? '',
        brand: map['marca']?.toString() ?? map['brand']?.toString() ?? '',
        name: map['nome']?.toString() ?? map['name']?.toString() ?? '',
        location:
            map['local']?.toString() ??
            map['location']?.toString() ??
            map['local_instalacao']?.toString() ??
            '',
        model: map['modelo']?.toString() ?? map['model']?.toString() ?? '',
        btus: _intFromJson(map['capacidade_btu'] ?? map['btus']),
        gas:
            map['gas_refrigerante']?.toString() ?? map['gas']?.toString() ?? '',
        serialNumber:
            map['numero_serie']?.toString() ??
            map['serialNumber']?.toString() ??
            '',
        impossibleFields: _impossibleFieldsFromJson(map),
        executionStatus:
            map['status_execucao']?.toString() ??
            map['executionStatus']?.toString() ??
            'pendente',
      );
    }).toList();
  }

  WorkOrderEquipment _equipmentFromJson(Map<String, dynamic> map) {
    return WorkOrderEquipment(
      id: map['id']?.toString() ?? map['equipamento_id']?.toString() ?? '',
      qrCode: map['codigo_qr']?.toString() ?? '',
      type: map['tipo']?.toString() ?? '',
      brand: map['marca']?.toString() ?? '',
      name:
          map['local_instalacao']?.toString() ??
          map['modelo']?.toString() ??
          '',
      location: map['local_instalacao']?.toString() ?? '',
      model: map['modelo']?.toString() ?? '',
      btus: _intFromJson(map['capacidade_btu']),
      gas: map['gas_refrigerante']?.toString() ?? '',
      serialNumber: map['numero_serie']?.toString() ?? '',
      impossibleFields: _impossibleFieldsFromJson(map),
      executionStatus:
          map['status_execucao']?.toString() ??
          map['executionStatus']?.toString() ??
          'pendente',
    );
  }

  int? _intFromJson(Object? value) {
    if (value == null) {
      return null;
    }
    return int.tryParse(value.toString());
  }

  String _errorMessage(String body, {required String fallback}) {
    if (body.trim().isEmpty) {
      return fallback;
    }

    try {
      final decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic>) {
        final message = decoded['message'];
        if (message is String && message.trim().isNotEmpty) {
          return message;
        }
        if (message is List && message.isNotEmpty) {
          return message.join(' ');
        }
      }
    } on Object {
      return fallback;
    }

    return fallback;
  }

  Map<String, String> _impossibleFieldsFromJson(Map<String, dynamic> map) {
    final raw = map['dados_impossiveis'] ?? map['impossibleFields'];
    if (raw is! List) {
      return const {};
    }
    return {
      for (final item in raw.whereType<Map<String, dynamic>>())
        item['campo'].toString(): item['observacao'].toString(),
    };
  }

  WorkOrderStatus _statusFromJson(String status) {
    return switch (status.toLowerCase()) {
      'em_andamento' ||
      'em_atendimento' ||
      'em_deslocamento' => WorkOrderStatus.inProgress,
      'concluida' || 'concluida_local' => WorkOrderStatus.done,
      'aguardando_sync' || 'erro_sync' => WorkOrderStatus.waitingSync,
      'sincronizada' => WorkOrderStatus.synced,
      _ => WorkOrderStatus.pending,
    };
  }
}
