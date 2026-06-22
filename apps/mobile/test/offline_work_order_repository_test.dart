import 'dart:io';

import 'package:airmovebr_mobile/src/models/work_order.dart';
import 'package:airmovebr_mobile/src/repositories/offline_work_order_repository.dart';
import 'package:airmovebr_mobile/src/repositories/offline_sync_store.dart';
import 'package:airmovebr_mobile/src/repositories/work_order_repository.dart';
import 'package:airmovebr_mobile/src/services/location_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'salvar checklist offline entra na fila e marca OS aguardando sync',
    () async {
      final remote = _RemoteRepository(failNextChecklist: true);
      final store = MemoryOfflineSyncStore();
      final repository = OfflineWorkOrderRepository(
        remote: remote,
        store: store,
      );
      final order = _order();

      await repository.saveChecklist(
        order,
        equipmentId: 'EQ-1',
        checklistType: 'mensal',
        responses: const [
          WorkOrderChecklistResponse(
            code: 'M1',
            kind: 'checkbox',
            value: 'true',
          ),
        ],
      );
      final orders = await repository.listMine();

      expect(await repository.pendingSyncCount(), 1);
      expect(orders.single.status, WorkOrderStatus.waitingSync);
      expect(orders.single.backendStatus, 'aguardando_sync');
    },
  );

  test('sincronizar fila reenvia checklist pendente e limpa fila', () async {
    final remote = _RemoteRepository(failNextChecklist: true);
    final store = MemoryOfflineSyncStore();
    final repository = OfflineWorkOrderRepository(remote: remote, store: store);
    final order = _order();

    await repository.saveChecklist(
      order,
      equipmentId: 'EQ-1',
      checklistType: 'mensal',
      responses: const [
        WorkOrderChecklistResponse(code: 'M1', kind: 'checkbox', value: 'true'),
      ],
    );
    final result = await repository.syncPending();

    expect(result.synced, 1);
    expect(result.failed, 0);
    expect(remote.savedChecklists, 1);
    expect(await repository.pendingSyncCount(), 0);
  });
}

WorkOrder _order() {
  return WorkOrder(
    id: 'OS-1',
    clientName: 'Cliente',
    address: 'Rua 1',
    equipment: 'Split',
    maintenanceType: 'PMOC',
    scheduledAt: DateTime(2026, 6, 22),
    status: WorkOrderStatus.inProgress,
    backendStatus: 'em_atendimento',
  );
}

class _RemoteRepository implements WorkOrderRepository {
  _RemoteRepository({this.failNextChecklist = false});

  bool failNextChecklist;
  int savedChecklists = 0;

  @override
  Future<List<WorkOrder>> listMine() async => [_order()];

  @override
  Future<WorkOrder> startService(WorkOrder order, GeoPoint location) async {
    return order.copyWith(
      status: WorkOrderStatus.inProgress,
      backendStatus: 'em_atendimento',
    );
  }

  @override
  Future<WorkOrder> arriveAtClient(WorkOrder order, GeoPoint location) async {
    return order.copyWith(
      status: WorkOrderStatus.inProgress,
      backendStatus: 'em_atendimento',
    );
  }

  @override
  Future<WorkOrderEquipment> saveMachineData(
    WorkOrder order,
    MachineDataInput input,
  ) async {
    return WorkOrderEquipment(
      id: input.equipmentId ?? 'EQ-1',
      name: input.location,
      location: input.location,
      model: input.model,
    );
  }

  @override
  Future<void> saveChecklist(
    WorkOrder order, {
    required String equipmentId,
    required String checklistType,
    required List<WorkOrderChecklistResponse> responses,
  }) async {
    if (failNextChecklist) {
      failNextChecklist = false;
      throw const SocketException('offline');
    }
    savedChecklists += 1;
  }

  @override
  Future<String> saveChecklistPhoto(
    WorkOrder order, {
    required String equipmentId,
    required String code,
    required ChecklistPhotoFile photo,
  }) async {
    return '/storage/foto.jpg';
  }

  @override
  Future<void> saveInitialEvidence(
    WorkOrder order, {
    required String description,
    required ChecklistPhotoFile photo,
  }) async {}

  @override
  Future<void> saveFinalEvidence(
    WorkOrder order, {
    required String description,
    required ChecklistPhotoFile photo,
  }) async {}

  @override
  Future<WorkOrder> finishWorkOrder(
    WorkOrder order,
    FinalizeWorkOrderInput input,
  ) async {
    return order.copyWith(
      status: WorkOrderStatus.done,
      backendStatus: 'concluida',
    );
  }

  @override
  Future<int> pendingSyncCount() async => 0;

  @override
  Future<OfflineSyncResult> syncPending() async => const OfflineSyncResult();
}
