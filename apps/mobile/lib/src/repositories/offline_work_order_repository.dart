import 'dart:async';
import 'dart:convert';
import 'dart:io';

import '../models/work_order.dart';
import '../services/location_service.dart';
import 'offline_sync_store.dart';
import 'work_order_repository.dart';

class OfflineWorkOrderRepository implements WorkOrderRepository {
  OfflineWorkOrderRepository({required this.remote, OfflineSyncStore? store})
    : store = store ?? OfflineSyncStore();

  final WorkOrderRepository remote;
  final OfflineSyncStore store;
  List<WorkOrder> _cachedOrders = [];

  @override
  Future<List<WorkOrder>> listMine() async {
    try {
      _cachedOrders = await remote.listMine();
    } on Object catch (error) {
      if (!_isOffline(error)) {
        rethrow;
      }
    }

    final pending = await store.readAll();
    if (_cachedOrders.isEmpty && pending.isNotEmpty) {
      _cachedOrders = pending
          .where((item) => item['order'] is Map<String, dynamic>)
          .map((item) => _orderFromJson(item['order'] as Map<String, dynamic>))
          .toList();
    }

    final pendingIds = pending
        .map((item) => item['order_id']?.toString())
        .whereType<String>()
        .toSet();

    return _cachedOrders
        .map(
          (order) => pendingIds.contains(order.id)
              ? order.copyWith(
                  status: WorkOrderStatus.waitingSync,
                  backendStatus: 'aguardando_sync',
                )
              : order,
        )
        .toList();
  }

  @override
  Future<WorkOrder> startService(WorkOrder order, GeoPoint location) {
    return remote.startService(order, location);
  }

  @override
  Future<WorkOrder> arriveAtClient(WorkOrder order, GeoPoint location) {
    return remote.arriveAtClient(order, location);
  }

  @override
  Future<WorkOrderEquipment> saveMachineData(
    WorkOrder order,
    MachineDataInput input,
  ) {
    return remote.saveMachineData(order, input);
  }

  @override
  Future<void> saveChecklist(
    WorkOrder order, {
    required String equipmentId,
    required String checklistType,
    required List<WorkOrderChecklistResponse> responses,
  }) async {
    try {
      await remote.saveChecklist(
        order,
        equipmentId: equipmentId,
        checklistType: checklistType,
        responses: responses,
      );
    } on Object catch (error) {
      if (!_isOffline(error)) {
        rethrow;
      }
      await store.add({
        'kind': 'checklist',
        'order_id': order.id,
        'order': _orderToJson(order),
        'equipment_id': equipmentId,
        'checklist_type': checklistType,
        'responses': responses.map(_responseToJson).toList(),
      });
    }
  }

  @override
  Future<String> saveChecklistPhoto(
    WorkOrder order, {
    required String equipmentId,
    required String code,
    required ChecklistPhotoFile photo,
  }) async {
    try {
      return await remote.saveChecklistPhoto(
        order,
        equipmentId: equipmentId,
        code: code,
        photo: photo,
      );
    } on Object catch (error) {
      if (!_isOffline(error)) {
        rethrow;
      }
      final localUrl = 'offline://${order.id}/checklist/$equipmentId/$code';
      await store.add({
        'kind': 'checklist_photo',
        'order_id': order.id,
        'order': _orderToJson(order),
        'equipment_id': equipmentId,
        'code': code,
        'photo': _photoToJson(photo),
      });
      return localUrl;
    }
  }

  @override
  Future<void> saveInitialEvidence(
    WorkOrder order, {
    required String description,
    required ChecklistPhotoFile photo,
  }) async {
    try {
      await remote.saveInitialEvidence(
        order,
        description: description,
        photo: photo,
      );
    } on Object catch (error) {
      if (!_isOffline(error)) {
        rethrow;
      }
      await store.add({
        'kind': 'initial_evidence',
        'order_id': order.id,
        'order': _orderToJson(order),
        'description': description,
        'photo': _photoToJson(photo),
      });
    }
  }

  @override
  Future<void> saveFinalEvidence(
    WorkOrder order, {
    required String description,
    required ChecklistPhotoFile photo,
  }) async {
    try {
      await remote.saveFinalEvidence(
        order,
        description: description,
        photo: photo,
      );
    } on Object catch (error) {
      if (!_isOffline(error)) {
        rethrow;
      }
      await store.add({
        'kind': 'final_evidence',
        'order_id': order.id,
        'order': _orderToJson(order),
        'description': description,
        'photo': _photoToJson(photo),
      });
    }
  }

  @override
  Future<WorkOrder> finishWorkOrder(
    WorkOrder order,
    FinalizeWorkOrderInput input,
  ) async {
    try {
      return await remote.finishWorkOrder(order, input);
    } on Object catch (error) {
      if (!_isOffline(error)) {
        rethrow;
      }
      await store.add({
        'kind': 'finish',
        'order_id': order.id,
        'order': _orderToJson(order),
        'input': _finishInputToJson(input),
      });
      return order.copyWith(
        status: WorkOrderStatus.waitingSync,
        backendStatus: 'aguardando_sync',
      );
    }
  }

  @override
  Future<int> pendingSyncCount() async {
    return (await store.readAll()).length;
  }

  @override
  Future<OfflineSyncResult> syncPending() async {
    final pending = await store.readAll();
    final remaining = <Map<String, dynamic>>[];
    var synced = 0;
    var failed = 0;

    for (final item in pending) {
      try {
        await _sendPendingItem(item);
        synced += 1;
      } on Object catch (error) {
        failed += 1;
        remaining.add(item);
        if (!_isOffline(error)) {
          continue;
        }
      }
    }

    await store.writeAll(remaining);
    return OfflineSyncResult(synced: synced, failed: failed);
  }

  Future<void> _sendPendingItem(Map<String, dynamic> item) async {
    final order = _orderFromJson(item['order'] as Map<String, dynamic>);
    switch (item['kind']) {
      case 'checklist':
        await remote.saveChecklist(
          order,
          equipmentId: item['equipment_id'].toString(),
          checklistType: item['checklist_type'].toString(),
          responses: (item['responses'] as List)
              .whereType<Map<String, dynamic>>()
              .map(_responseFromJson)
              .toList(),
        );
        break;
      case 'checklist_photo':
        await remote.saveChecklistPhoto(
          order,
          equipmentId: item['equipment_id'].toString(),
          code: item['code'].toString(),
          photo: _photoFromJson(item['photo'] as Map<String, dynamic>),
        );
        break;
      case 'initial_evidence':
        await remote.saveInitialEvidence(
          order,
          description: item['description'].toString(),
          photo: _photoFromJson(item['photo'] as Map<String, dynamic>),
        );
        break;
      case 'final_evidence':
        await remote.saveFinalEvidence(
          order,
          description: item['description'].toString(),
          photo: _photoFromJson(item['photo'] as Map<String, dynamic>),
        );
        break;
      case 'finish':
        await remote.finishWorkOrder(
          order,
          _finishInputFromJson(item['input'] as Map<String, dynamic>),
        );
        break;
    }
  }

  bool _isOffline(Object error) {
    return error is SocketException || error is TimeoutException;
  }

  Map<String, dynamic> _orderToJson(WorkOrder order) {
    return {
      'id': order.id,
      'client_name': order.clientName,
      'address': order.address,
      'equipment': order.equipment,
      'maintenance_type': order.maintenanceType,
      'checklist_type': order.checklistType,
      'scheduled_at': order.scheduledAt.toIso8601String(),
      'status': order.status.name,
      'backend_status': order.backendStatus,
    };
  }

  WorkOrder _orderFromJson(Map<String, dynamic> json) {
    return WorkOrder(
      id: json['id'].toString(),
      clientName: json['client_name'].toString(),
      address: json['address'].toString(),
      equipment: json['equipment'].toString(),
      maintenanceType: json['maintenance_type'].toString(),
      checklistType: json['checklist_type']?.toString() ?? 'mensal',
      scheduledAt: DateTime.parse(json['scheduled_at'].toString()),
      status: WorkOrderStatus.values.firstWhere(
        (status) => status.name == json['status'],
        orElse: () => WorkOrderStatus.waitingSync,
      ),
      backendStatus: json['backend_status']?.toString(),
    );
  }

  Map<String, dynamic> _responseToJson(WorkOrderChecklistResponse response) {
    return {
      'code': response.code,
      'kind': response.kind,
      'value': response.value,
      'note': response.note,
    };
  }

  WorkOrderChecklistResponse _responseFromJson(Map<String, dynamic> json) {
    return WorkOrderChecklistResponse(
      code: json['code'].toString(),
      kind: json['kind'].toString(),
      value: json['value'].toString(),
      note: json['note']?.toString(),
    );
  }

  Map<String, dynamic> _photoToJson(ChecklistPhotoFile photo) {
    return {
      'filename': photo.filename,
      'mime_type': photo.mimeType,
      'bytes': base64Encode(photo.bytes),
    };
  }

  ChecklistPhotoFile _photoFromJson(Map<String, dynamic> json) {
    return ChecklistPhotoFile(
      filename: json['filename'].toString(),
      mimeType: json['mime_type'].toString(),
      bytes: base64Decode(json['bytes'].toString()),
    );
  }

  Map<String, dynamic> _finishInputToJson(FinalizeWorkOrderInput input) {
    return {
      'signature': input.signatureBase64,
      'responsible': input.responsibleName,
      'latitude': input.latitude,
      'longitude': input.longitude,
      'finalized_at': input.finalizedAt.toIso8601String(),
    };
  }

  FinalizeWorkOrderInput _finishInputFromJson(Map<String, dynamic> json) {
    return FinalizeWorkOrderInput(
      signatureBase64: json['signature'].toString(),
      responsibleName: json['responsible'].toString(),
      latitude: double.parse(json['latitude'].toString()),
      longitude: double.parse(json['longitude'].toString()),
      finalizedAt: DateTime.parse(json['finalized_at'].toString()),
    );
  }
}
