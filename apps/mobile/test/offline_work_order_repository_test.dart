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
      final remote = _RemoteRepository(failChecklistAlways: true);
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
      expect(
        orders.single.equipments.single.executionStatus,
        'aguardando_sync',
      );
    },
  );

  test('offline preserva duas etapas do checklist da mesma máquina', () async {
    final remote = _RemoteRepository(failNextChecklist: true);
    final store = MemoryOfflineSyncStore();
    final repository = OfflineWorkOrderRepository(remote: remote, store: store);
    final order = _order(
      checklistType: 'anual',
      checklist: const [
        WorkOrderChecklistItem(
          code: 'ANU_HIGIENIZACAO_EVAP',
          label: 'Evaporadora',
          kind: 'select_obs',
          stage: 'evaporadora',
        ),
        WorkOrderChecklistItem(
          code: 'ANU_HIGIENIZACAO_COND',
          label: 'Condensadora',
          kind: 'select_obs',
          stage: 'condensadora',
        ),
      ],
    );

    await repository.saveChecklist(
      order,
      equipmentId: 'EQ-1',
      checklistType: 'anual',
      responses: const [
        WorkOrderChecklistResponse(
          code: 'ANU_HIGIENIZACAO_EVAP',
          kind: 'select_obs',
          value: 'Executado',
        ),
      ],
    );
    remote.failNextChecklist = true;
    await repository.saveChecklist(
      order,
      equipmentId: 'EQ-1',
      checklistType: 'anual',
      responses: const [
        WorkOrderChecklistResponse(
          code: 'ANU_HIGIENIZACAO_COND',
          kind: 'select_obs',
          value: 'Executado',
        ),
      ],
    );

    final result = await repository.syncPending();

    expect(result.synced, 2);
    expect(remote.savedResponseCodes, {
      'ANU_HIGIENIZACAO_EVAP',
      'ANU_HIGIENIZACAO_COND',
    });
    expect(await repository.pendingSyncCount(), 0);
  });

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

  test(
    'listar OS tenta sincronizar checklist pendente antes de carregar',
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

      expect(orders, hasLength(1));
      expect(remote.savedChecklists, 1);
      expect(await repository.pendingSyncCount(), 0);
    },
  );
}

WorkOrder _order({
  String checklistType = 'mensal',
  List<WorkOrderChecklistItem> checklist = const [],
}) {
  return WorkOrder(
    id: 'OS-1',
    clientName: 'Cliente',
    address: 'Rua 1',
    equipment: 'Split',
    maintenanceType: 'PMOC',
    checklistType: checklistType,
    checklist: checklist,
    scheduledAt: DateTime(2026, 6, 22),
    status: WorkOrderStatus.inProgress,
    backendStatus: 'em_atendimento',
    equipments: const [
      WorkOrderEquipment(
        id: 'EQ-1',
        name: 'Sala 1',
        location: 'Sala 1',
        model: 'Split',
      ),
    ],
  );
}

class _RemoteRepository implements WorkOrderRepository {
  _RemoteRepository({
    this.failNextChecklist = false,
    this.failChecklistAlways = false,
  });

  bool failNextChecklist;
  bool failChecklistAlways;
  int savedChecklists = 0;
  final Set<String> savedResponseCodes = {};

  @override
  Future<List<WorkOrder>> listMine() async => [_order()];

  @override
  Future<WorkOrder> startService(
    WorkOrder order,
    GeoPoint location,
    SafetyCheckInput safety,
  ) async {
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
    if (failChecklistAlways || failNextChecklist) {
      failNextChecklist = false;
      throw const SocketException('offline');
    }
    savedChecklists += 1;
    savedResponseCodes.addAll(responses.map((response) => response.code));
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
