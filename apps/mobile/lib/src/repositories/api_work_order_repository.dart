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
      action: 'iniciar_rota',
      fallbackStatus: 'em_deslocamento',
      errorPrefix: 'Falha ao iniciar OS',
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
      scheduledAt: _dateFromJson(json),
      status: _statusFromJson(json['status'].toString()),
      backendStatus: json['status'].toString(),
    );
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
        name: map['nome']?.toString() ?? map['name'].toString(),
        location: map['local']?.toString() ?? map['location']?.toString() ?? '',
        model: map['modelo']?.toString() ?? map['model']?.toString() ?? '',
      );
    }).toList();
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
