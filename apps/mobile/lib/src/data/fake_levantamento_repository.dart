import '../models/levantamento.dart';
import '../models/work_order.dart';
import '../repositories/levantamento_repository.dart';

class FakeLevantamentoRepository implements LevantamentoRepository {
  final List<Levantamento> _items = [const Levantamento(id: 'levantamento-demo', clientName: 'Cliente demonstração', address: 'Rua AirMove, 100', problem: 'Avaliar equipamento no local.', type: LevantamentoTipo.corretiva, status: 'agendado')];
  @override Future<List<Levantamento>> listMine() async => _items;
  @override Future<Levantamento> start(Levantamento item) async => item;
  @override Future<Levantamento> saveDraft(Levantamento item, LevantamentoDraft draft) async => item;
  @override Future<void> uploadPhoto(Levantamento item, ChecklistPhotoFile photo, {String? caption}) async {}
  @override Future<Levantamento> finish(Levantamento item, LevantamentoDraft draft, String decision) async => item;
}
