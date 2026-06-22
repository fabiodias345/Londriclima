import '../models/work_order.dart';
import '../services/location_service.dart';

class OfflineSyncResult {
  const OfflineSyncResult({this.synced = 0, this.failed = 0});

  final int synced;
  final int failed;
}

abstract class WorkOrderRepository {
  Future<List<WorkOrder>> listMine();

  Future<WorkOrder> startService(WorkOrder order, GeoPoint location);

  Future<WorkOrder> arriveAtClient(WorkOrder order, GeoPoint location);

  Future<WorkOrderEquipment> saveMachineData(
    WorkOrder order,
    MachineDataInput input,
  );

  Future<void> saveChecklist(
    WorkOrder order, {
    required String equipmentId,
    required String checklistType,
    required List<WorkOrderChecklistResponse> responses,
  });

  Future<String> saveChecklistPhoto(
    WorkOrder order, {
    required String equipmentId,
    required String code,
    required ChecklistPhotoFile photo,
  });

  Future<void> saveInitialEvidence(
    WorkOrder order, {
    required String description,
    required ChecklistPhotoFile photo,
  });

  Future<void> saveFinalEvidence(
    WorkOrder order, {
    required String description,
    required ChecklistPhotoFile photo,
  });

  Future<WorkOrder> finishWorkOrder(
    WorkOrder order,
    FinalizeWorkOrderInput input,
  );

  Future<int> pendingSyncCount();

  Future<OfflineSyncResult> syncPending();
}
