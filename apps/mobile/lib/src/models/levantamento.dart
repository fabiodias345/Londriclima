import 'work_order.dart';

enum LevantamentoTipo { preventiva, corretiva, instalacao, pmoc, outros }

extension LevantamentoTipoLabel on LevantamentoTipo {
  String get value => switch (this) {
    LevantamentoTipo.preventiva => 'manutencao_preventiva',
    LevantamentoTipo.corretiva => 'manutencao_corretiva',
    LevantamentoTipo.instalacao => 'instalacao',
    LevantamentoTipo.pmoc => 'pmoc',
    LevantamentoTipo.outros => 'outros',
  };

  String get label => switch (this) {
    LevantamentoTipo.preventiva => 'Manutenção preventiva',
    LevantamentoTipo.corretiva => 'Manutenção corretiva',
    LevantamentoTipo.instalacao => 'Instalação',
    LevantamentoTipo.pmoc => 'PMOC',
    LevantamentoTipo.outros => 'Outros',
  };
}

LevantamentoTipo levantamentoTipoFrom(String? value) => LevantamentoTipo.values.firstWhere((item) => item.value == value, orElse: () => LevantamentoTipo.corretiva);

class Levantamento {
  const Levantamento({required this.id, required this.clientName, required this.address, required this.problem, required this.type, required this.status, this.diagnosis = '', this.cause = '', this.recommendedServices = '', this.notes = '', this.photos = const []});
  final String id;
  final String clientName;
  final String address;
  final String problem;
  final LevantamentoTipo type;
  final String status;
  final String diagnosis;
  final String cause;
  final String recommendedServices;
  final String notes;
  final List<String> photos;
}

class LevantamentoDraft {
  const LevantamentoDraft({required this.diagnosis, required this.cause, required this.recommendedServices, required this.notes});
  final String diagnosis;
  final String cause;
  final String recommendedServices;
  final String notes;
}
