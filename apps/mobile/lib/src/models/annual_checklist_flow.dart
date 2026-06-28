import 'work_order.dart';

enum AnnualChecklistStage { evaporadora, condensadora }

extension AnnualChecklistStageLabel on AnnualChecklistStage {
  String get code => name;

  String get label => switch (this) {
    AnnualChecklistStage.evaporadora => 'Evaporadora',
    AnnualChecklistStage.condensadora => 'Condensadora',
  };

  String get completionCode => 'ANU_ETAPA_${name.toUpperCase()}_CONCLUIDA';
}

bool annualChecklistStagesComplete(List<WorkOrderChecklistResponse> responses) {
  return annualChecklistCompletedStages(responses).length ==
      AnnualChecklistStage.values.length;
}

Set<AnnualChecklistStage> annualChecklistCompletedStages(
  List<WorkOrderChecklistResponse> responses,
) {
  return AnnualChecklistStage.values.where((stage) {
    return responses.any(
      (response) =>
          response.code == stage.completionCode &&
          response.kind == 'etapa' &&
          response.value == 'concluida',
    );
  }).toSet();
}

AnnualChecklistStage firstIncompleteAnnualChecklistStage(
  List<WorkOrderChecklistResponse> responses,
) {
  final completed = annualChecklistCompletedStages(responses);
  return AnnualChecklistStage.values.firstWhere(
    (stage) => !completed.contains(stage),
    orElse: () => AnnualChecklistStage.evaporadora,
  );
}
