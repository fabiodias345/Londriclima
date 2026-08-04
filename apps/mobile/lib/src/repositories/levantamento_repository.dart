import '../models/levantamento.dart';
import '../models/work_order.dart';

abstract class LevantamentoRepository {
  Future<List<Levantamento>> listMine();
  Future<Levantamento> start(Levantamento item);
  Future<Levantamento> saveDraft(Levantamento item, LevantamentoDraft draft);
  Future<void> uploadPhoto(Levantamento item, ChecklistPhotoFile photo, {String? caption});
  Future<Levantamento> finish(Levantamento item, LevantamentoDraft draft, String decision);
}
