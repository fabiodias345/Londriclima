enum WorkOrderStatus { pending, inProgress, done, waitingSync, synced }

enum WorkOrderFilter { all, today, pending, inProgress, done, waitingSync }

class WorkOrder {
  const WorkOrder({
    required this.id,
    required this.clientName,
    required this.address,
    required this.equipment,
    this.equipments = const [],
    required this.maintenanceType,
    this.serviceType = 'preventiva',
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
  final String serviceType;
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

  bool get isCorrective => serviceType == 'corretiva';

  bool get isInstallation => serviceType == 'instalacao';

  String get serviceLabel {
    if (isCorrective) {
      return 'Corretiva';
    }
    if (isInstallation) {
      return 'Instalação';
    }

    return 'Preventiva ${_checklistTypeLabel(checklistType).toLowerCase()}';
  }

  List<WorkOrderChecklistItem> get effectiveChecklist {
    return isCorrective ? correctiveChecklist : checklist;
  }

  WorkOrder copyWith({
    WorkOrderStatus? status,
    String? backendStatus,
    List<WorkOrderEquipment>? equipments,
  }) {
    return WorkOrder(
      id: id,
      clientName: clientName,
      address: address,
      equipment: equipment,
      equipments: equipments ?? this.equipments,
      maintenanceType: maintenanceType,
      serviceType: serviceType,
      checklistType: checklistType,
      checklist: checklist,
      scheduledAt: scheduledAt,
      status: status ?? this.status,
      backendStatus: backendStatus ?? this.backendStatus,
    );
  }

  bool matches(WorkOrderFilter filter, DateTime now) {
    return switch (filter) {
      WorkOrderFilter.all => true,
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

  static String _checklistTypeLabel(String value) {
    return switch (value) {
      'trimestral' => 'Trimestral',
      'semestral' => 'Semestral',
      'anual' => 'Anual',
      _ => 'Mensal',
    };
  }

  static const correctiveChecklist = [
    WorkOrderChecklistItem(
      code: 'C1',
      label: 'Problema encontrado',
      kind: 'texto',
    ),
    WorkOrderChecklistItem(code: 'C2', label: 'Acao realizada', kind: 'texto'),
    WorkOrderChecklistItem(
      code: 'C3',
      label: 'Foto do atendimento',
      kind: 'foto',
    ),
    WorkOrderChecklistItem(
      code: 'C4',
      label: 'Pecas utilizadas',
      kind: 'texto',
    ),
    WorkOrderChecklistItem(
      code: 'C5',
      label: 'Observacao final',
      kind: 'texto',
    ),
    WorkOrderChecklistItem(
      code: 'C6',
      label: 'Finalizacao',
      kind: 'finalizacao',
    ),
  ];
}

class WorkOrderChecklistItem {
  const WorkOrderChecklistItem({
    required this.code,
    required this.label,
    required this.kind,
    this.options = const [],
    this.unit,
    this.required = true,
    this.stage = 'geral',
  });

  final String code;
  final String label;
  final String kind;
  final List<String> options;
  final String? unit;
  final bool required;
  final String stage;
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

class FinalizeWorkOrderInput {
  const FinalizeWorkOrderInput({
    required this.signatureBase64,
    required this.responsibleName,
    this.technicianSignatureBase64 = '',
    this.technicianName = '',
    required this.latitude,
    required this.longitude,
    required this.finalizedAt,
  });

  final String signatureBase64;
  final String responsibleName;
  final String technicianSignatureBase64;
  final String technicianName;
  final double latitude;
  final double longitude;
  final DateTime finalizedAt;
}

class SafetyCheckInput {
  const SafetyCheckInput({
    required this.ppeConfirmed,
    required this.equipmentPoweredOff,
    required this.safeAreaAndTools,
    required this.workAtHeight,
    required this.nr35Valid,
    required this.parachuteHarness,
    required this.anchoredLanyard,
    required this.isolatedArea,
  });

  final bool ppeConfirmed;
  final bool equipmentPoweredOff;
  final bool safeAreaAndTools;
  final bool workAtHeight;
  final bool nr35Valid;
  final bool parachuteHarness;
  final bool anchoredLanyard;
  final bool isolatedArea;

  bool get approved =>
      ppeConfirmed &&
      equipmentPoweredOff &&
      safeAreaAndTools &&
      (!workAtHeight ||
          (nr35Valid && parachuteHarness && anchoredLanyard && isolatedArea));

  Map<String, bool> toJson() => {
    'epis_confirmados': ppeConfirmed,
    'equipamento_desligado': equipmentPoweredOff,
    'area_ferramentas_seguras': safeAreaAndTools,
    'trabalho_altura': workAtHeight,
    'nr35_valida': nr35Valid,
    'cinto_paraquedista': parachuteHarness,
    'talabarte_ancorado': anchoredLanyard,
    'area_isolada': isolatedArea,
  };
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
    this.executionStatus = 'pendente',
    this.checklistResponses = const [],
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
  final String executionStatus;
  final List<WorkOrderChecklistResponse> checklistResponses;

  bool get isDone => executionStatus == 'feito';

  bool get isWaitingSync => executionStatus == 'aguardando_sync';

  bool get isPending => !isDone && !isWaitingSync;

  WorkOrderEquipment copyWith({
    String? executionStatus,
    List<WorkOrderChecklistResponse>? checklistResponses,
  }) {
    return WorkOrderEquipment(
      id: id,
      qrCode: qrCode,
      type: type,
      brand: brand,
      name: name,
      location: location,
      model: model,
      btus: btus,
      gas: gas,
      serialNumber: serialNumber,
      impossibleFields: impossibleFields,
      executionStatus: executionStatus ?? this.executionStatus,
      checklistResponses: checklistResponses ?? this.checklistResponses,
    );
  }

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
