import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import '../models/levantamento.dart';
import '../models/work_order.dart';
import 'levantamento_repository.dart';

class ApiLevantamentoRepository implements LevantamentoRepository {
  ApiLevantamentoRepository({required this.baseUrl, required this.token});
  final Uri baseUrl;
  final String token;

  @override
  Future<List<Levantamento>> listMine() async {
    final response = await _request('GET', '/api/v1/mobile/levantamentos');
    final data = response['items'] as List? ?? const [];
    return data.map((item) => _fromJson(item as Map<String, dynamic>)).toList();
  }

  @override
  Future<Levantamento> start(Levantamento item) async => _fromJson(await _request('POST', '/api/v1/mobile/levantamentos/${item.id}/iniciar'));

  @override
  Future<Levantamento> saveDraft(Levantamento item, LevantamentoDraft draft) async => _fromJson(await _request('PATCH', '/api/v1/mobile/levantamentos/${item.id}/rascunho', {
    'diagnostico': draft.diagnosis, 'causa_provavel': draft.cause, 'servicos_recomendados': draft.recommendedServices, 'observacoes': draft.notes,
  }));

  @override
  Future<Levantamento> finish(Levantamento item, LevantamentoDraft draft, String decision) async => _fromJson(await _request('POST', '/api/v1/mobile/levantamentos/${item.id}/finalizar', {
    'diagnostico': draft.diagnosis, 'causa_provavel': draft.cause, 'servicos_recomendados': draft.recommendedServices, 'observacoes': draft.notes, 'decisao': decision,
  }));

  @override
  Future<void> uploadPhoto(Levantamento item, ChecklistPhotoFile photo, {String? caption}) async {
    final client = HttpClient();
    try {
      final request = await client.postUrl(baseUrl.resolve('/api/v1/mobile/levantamentos/${item.id}/fotos'));
      request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      final boundary = 'airmovebr-${DateTime.now().microsecondsSinceEpoch}';
      request.headers.set(HttpHeaders.contentTypeHeader, 'multipart/form-data; boundary=$boundary');
      final body = BytesBuilder();
      void line(String text) => body.add(utf8.encode('$text\r\n'));
      if (caption != null && caption.trim().isNotEmpty) { line('--$boundary'); line('Content-Disposition: form-data; name="legenda"'); line(''); line(caption.trim()); }
      line('--$boundary'); line('Content-Disposition: form-data; name="foto"; filename="${photo.filename}"'); line('Content-Type: ${photo.mimeType}'); line(''); body.add(photo.bytes); line(''); line('--$boundary--');
      request.add(body.takeBytes());
      final response = await request.close();
      if (response.statusCode < 200 || response.statusCode >= 300) throw HttpException('Falha ao enviar foto.');
    } finally { client.close(force: true); }
  }

  Future<Map<String, dynamic>> _request(String method, String path, [Map<String, dynamic>? payload]) async {
    final client = HttpClient();
    try {
      final request = method == 'GET' ? await client.getUrl(baseUrl.resolve(path)) : method == 'POST' ? await client.postUrl(baseUrl.resolve(path)) : await client.patchUrl(baseUrl.resolve(path));
      request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      if (payload != null) { request.headers.contentType = ContentType.json; request.write(jsonEncode(payload)); }
      final response = await request.close(); final body = await response.transform(utf8.decoder).join();
      if (response.statusCode < 200 || response.statusCode >= 300) throw HttpException(body.isEmpty ? 'Falha na operação.' : body);
      return body.isEmpty ? <String, dynamic>{} : jsonDecode(body) as Map<String, dynamic>;
    } finally { client.close(force: true); }
  }

  Levantamento _fromJson(Map<String, dynamic> json) {
    final client = json['cliente'] as Map<String, dynamic>?;
    final address = (client?['enderecos'] as List?)?.firstOrNull as Map<String, dynamic>?;
    return Levantamento(id: json['id'].toString(), clientName: client?['nome']?.toString() ?? 'Cliente', address: [address?['logradouro'], address?['numero'], address?['cidade']].whereType<String>().where((value) => value.isNotEmpty).join(', '), problem: json['problema']?.toString() ?? '', type: levantamentoTipoFrom(json['tipo_servico']?.toString()), status: json['status']?.toString() ?? '', diagnosis: json['diagnostico']?.toString() ?? '', cause: json['causa_provavel']?.toString() ?? '', recommendedServices: json['servicos_recomendados']?.toString() ?? '', notes: json['observacoes']?.toString() ?? '', photos: (json['fotos'] as List? ?? const []).map((photo) => (photo as Map<String, dynamic>)['url']?.toString() ?? '').where((url) => url.isNotEmpty).toList());
  }
}
