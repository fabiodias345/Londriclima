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
    this.checklistType = 'mensal',
    this.checklist = const [],
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
  final String checklistType;
  final List<WorkOrderChecklistItem> checklist;
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
      checklistType: checklistType,
      checklist: checklist,
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

class WorkOrderChecklistItem {
  const WorkOrderChecklistItem({
    required this.code,
    required this.label,
    required this.kind,
    this.options = const [],
    this.unit,
  });

  final String code;
  final String label;
  final String kind;
  final List<String> options;
  final String? unit;
}

class WorkOrderChecklistResponse {
  const WorkOrderChecklistResponse({
    required this.code,
    required this.kind,
    required this.value,
    this.note,
  });

  final String code;
  final String kind;
  final String value;
  final String? note;
}

class ChecklistPhotoFile {
  const ChecklistPhotoFile({
    required this.filename,
    required this.mimeType,
    required this.bytes,
  });

  final String filename;
  final String mimeType;
  final List<int> bytes;
}

abstract class ChecklistPhotoPicker {
  Future<ChecklistPhotoFile?> pickPhoto();
}

class WorkOrderEquipment {
  const WorkOrderEquipment({
    required this.id,
    this.qrCode = '',
    this.type = '',
    this.brand = '',
    required this.name,
    required this.location,
    required this.model,
    this.btus,
    this.gas = '',
    this.serialNumber = '',
    this.impossibleFields = const {},
  });

  final String id;
  final String qrCode;
  final String type;
  final String brand;
  final String name;
  final String location;
  final String model;
  final int? btus;
  final String gas;
  final String serialNumber;
  final Map<String, String> impossibleFields;

  bool hasRequiredMachineData() {
    return missingRequiredFields().isEmpty;
  }

  List<String> missingRequiredFields() {
    final required = {
      'codigo_qr': qrCode,
      'tipo': type,
      'marca': brand,
      'modelo': model,
      'capacidade_btu': btus?.toString() ?? '',
      'gas_refrigerante': gas,
      'numero_serie': serialNumber,
      'local_instalacao': location,
    };

    return required.entries
        .where(
          (entry) =>
              entry.value.trim().isEmpty &&
              !impossibleFields.containsKey(entry.key),
        )
        .map((entry) => entry.key)
        .toList();
  }
}

class MachineDataInput {
  const MachineDataInput({
    this.equipmentId,
    required this.qrCode,
    required this.type,
    required this.brand,
    required this.model,
    this.btus,
    required this.gas,
    required this.serialNumber,
    required this.location,
    this.impossibleFields = const {},
  });

  final String? equipmentId;
  final String qrCode;
  final String type;
  final String brand;
  final String model;
  final int? btus;
  final String gas;
  final String serialNumber;
  final String location;
  final Map<String, String> impossibleFields;
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
