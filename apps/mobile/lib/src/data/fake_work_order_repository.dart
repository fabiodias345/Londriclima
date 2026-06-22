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
            qrCode: 'QR-000101',
            type: 'Split',
            brand: 'LG',
            name: 'Evaporadora sala 101',
            location: 'Sala 101',
            model: 'Split Hi-Wall 24.000 BTUs',
            btus: 24000,
            gas: 'R-410A',
            serialNumber: 'SN-101',
          ),
          WorkOrderEquipment(
            id: 'EQ-102',
            qrCode: 'QR-000102',
            type: 'Split',
            brand: 'Samsung',
            name: 'Evaporadora sala 102',
            location: 'Sala 102',
            model: 'Split Hi-Wall 24.000 BTUs',
            btus: 24000,
            gas: 'R-410A',
            serialNumber: 'SN-102',
          ),
          WorkOrderEquipment(
            id: 'EQ-103',
            qrCode: 'QR-000103',
            type: 'Condensadora',
            brand: 'Carrier',
            name: 'Condensadora cobertura',
            location: 'Cobertura',
            model: 'Condensadora 24.000 BTUs',
            btus: 24000,
            gas: 'R-410A',
            serialNumber: 'SN-103',
          ),
        ],
        maintenanceType: 'Limpeza de filtros',
        checklistType: 'semestral',
        checklist: const [
          WorkOrderChecklistItem(
            code: 'M1',
            label: 'Desligar pelo controle remoto',
            kind: 'checkbox',
          ),
          WorkOrderChecklistItem(
            code: 'M4',
            label: 'Fotografar filtros antes',
            kind: 'foto',
          ),
          WorkOrderChecklistItem(
            code: 'M6',
            label: 'Condicao dos filtros',
            kind: 'select',
            options: ['ok', 'danificado', 'substituido'],
          ),
          WorkOrderChecklistItem(
            code: 'M9',
            label: 'Inspecao interior: mofo, sujidade, odor',
            kind: 'select_obs',
          ),
          WorkOrderChecklistItem(
            code: 'M16',
            label: 'Finalizacao',
            kind: 'finalizacao',
          ),
          WorkOrderChecklistItem(
            code: 'S6',
            label: 'Pressao do fluido refrigerante',
            kind: 'numerico',
            unit: 'bar/psi',
          ),
          WorkOrderChecklistItem(
            code: 'S7',
            label: 'Tipo de fluido refrigerante',
            kind: 'texto',
          ),
        ],
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
  Future<void> saveChecklist(
    WorkOrder order, {
    required String equipmentId,
    required String checklistType,
    required List<WorkOrderChecklistResponse> responses,
  }) async {}

  @override
  Future<WorkOrderEquipment> saveMachineData(
    WorkOrder order,
    MachineDataInput input,
  ) async {
    return WorkOrderEquipment(
      id:
          input.equipmentId ??
          'EQ-NOVA-${DateTime.now().millisecondsSinceEpoch}',
      qrCode: input.qrCode,
      type: input.type,
      brand: input.brand,
      name: input.location,
      location: input.location,
      model: input.model,
      btus: input.btus,
      gas: input.gas,
      serialNumber: input.serialNumber,
      impossibleFields: input.impossibleFields,
    );
  }
}
