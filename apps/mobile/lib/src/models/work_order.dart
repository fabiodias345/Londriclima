enum WorkOrderStatus { pending, inProgress, done, waitingSync, synced }

enum WorkOrderFilter { today, pending, inProgress, done, waitingSync }

class WorkOrder {
  const WorkOrder({
    required this.id,
    required this.clientName,
    required this.address,
    required this.equipment,
    this.equipments = const [],
    required this.maintenanceType,
    required this.scheduledAt,
    required this.status,
    this.backendStatus,
  });

  final String id;
  final String clientName;
  final String address;
  final String equipment;
  final List<WorkOrderEquipment> equipments;
  final String maintenanceType;
  final DateTime scheduledAt;
  final WorkOrderStatus status;
  final String? backendStatus;

  int get equipmentCount => equipments.isEmpty ? 1 : equipments.length;

  String get equipmentCountLabel {
    return equipmentCount == 1
        ? '1 equipamento'
        : '$equipmentCount equipamentos';
  }

  bool get isOnRoute => backendStatus == 'em_deslocamento';

  bool get isAtClient => backendStatus == 'em_atendimento';

  WorkOrder copyWith({WorkOrderStatus? status, String? backendStatus}) {
    return WorkOrder(
      id: id,
      clientName: clientName,
      address: address,
      equipment: equipment,
      equipments: equipments,
      maintenanceType: maintenanceType,
      scheduledAt: scheduledAt,
      status: status ?? this.status,
      backendStatus: backendStatus ?? this.backendStatus,
    );
  }

  bool matches(WorkOrderFilter filter, DateTime now) {
    return switch (filter) {
      WorkOrderFilter.today => _isSameDay(scheduledAt, now),
      WorkOrderFilter.pending => status == WorkOrderStatus.pending,
      WorkOrderFilter.inProgress => status == WorkOrderStatus.inProgress,
      WorkOrderFilter.done => status == WorkOrderStatus.done,
      WorkOrderFilter.waitingSync => status == WorkOrderStatus.waitingSync,
    };
  }

  static bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }
}

class WorkOrderEquipment {
  const WorkOrderEquipment({
    required this.id,
    required this.name,
    required this.location,
    required this.model,
  });

  final String id;
  final String name;
  final String location;
  final String model;
}

extension WorkOrderStatusLabel on WorkOrderStatus {
  String get label {
    return switch (this) {
      WorkOrderStatus.pending => 'Pendente',
      WorkOrderStatus.inProgress => 'Em andamento',
      WorkOrderStatus.done => 'Concluída',
      WorkOrderStatus.waitingSync => 'Aguardando sync',
      WorkOrderStatus.synced => 'Sincronizada',
    };
  }
}
