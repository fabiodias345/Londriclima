import '../models/work_order.dart';
import '../repositories/work_order_repository.dart';
import '../services/location_service.dart';

class FakeWorkOrderRepository implements WorkOrderRepository {
  @override
  Future<List<WorkOrder>> listMine() async {
    final today = DateTime.now();
    final tomorrow = today.add(const Duration(days: 1));

    return [
      WorkOrder(
        id: 'OS-1042',
        clientName: 'Hospital Norte',
        address: 'Av. Santos Dumont, 1480',
        equipment: 'Split Hi-Wall 24.000 BTUs',
        equipments: const [
          WorkOrderEquipment(
            id: 'EQ-101',
            name: 'Evaporadora sala 101',
            location: 'Sala 101',
            model: 'Split Hi-Wall 24.000 BTUs',
          ),
          WorkOrderEquipment(
            id: 'EQ-102',
            name: 'Evaporadora sala 102',
            location: 'Sala 102',
            model: 'Split Hi-Wall 24.000 BTUs',
          ),
          WorkOrderEquipment(
            id: 'EQ-103',
            name: 'Condensadora cobertura',
            location: 'Cobertura',
            model: 'Condensadora 24.000 BTUs',
          ),
        ],
        maintenanceType: 'Limpeza de filtros',
        scheduledAt: today,
        status: WorkOrderStatus.pending,
      ),
      WorkOrder(
        id: 'OS-1043',
        clientName: 'Clínica Centro',
        address: 'Rua Pará, 92',
        equipment: 'Cassete 36.000 BTUs',
        maintenanceType: 'Manutenção preventiva',
        scheduledAt: today,
        status: WorkOrderStatus.inProgress,
      ),
      WorkOrder(
        id: 'OS-1044',
        clientName: 'Mercado Aurora',
        address: 'Rua Goiás, 510',
        equipment: 'Piso teto 48.000 BTUs',
        maintenanceType: 'Manutenção completa',
        scheduledAt: tomorrow,
        status: WorkOrderStatus.waitingSync,
      ),
    ];
  }

  @override
  Future<WorkOrder> startService(WorkOrder order, GeoPoint location) async {
    return order.copyWith(
      status: WorkOrderStatus.inProgress,
      backendStatus: 'em_deslocamento',
    );
  }

  @override
  Future<WorkOrder> arriveAtClient(WorkOrder order, GeoPoint location) async {
    return order.copyWith(
      status: WorkOrderStatus.inProgress,
      backendStatus: 'em_atendimento',
    );
  }
}
