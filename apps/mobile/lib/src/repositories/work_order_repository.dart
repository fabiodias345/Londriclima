import '../models/work_order.dart';
import '../services/location_service.dart';

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
}
