import 'dart:convert';
import 'dart:io';

class OfflineSyncStore {
  OfflineSyncStore({File? file})
    : _file = file ?? File('${Directory.systemTemp.path}/airmovebr-sync.json');

  final File _file;

  Future<List<Map<String, dynamic>>> readAll() async {
    if (!await _file.exists()) {
      return [];
    }
    final content = await _file.readAsString();
    if (content.trim().isEmpty) {
      return [];
    }
    final decoded = jsonDecode(content);
    if (decoded is! List) {
      return [];
    }
    return decoded.whereType<Map<String, dynamic>>().toList();
  }

  Future<void> writeAll(List<Map<String, dynamic>> items) async {
    await _file.parent.create(recursive: true);
    await _file.writeAsString(jsonEncode(items));
  }

  Future<void> add(Map<String, dynamic> item) async {
    final items = await readAll();
    items.add(item);
    await writeAll(items);
  }

  Future<void> clear() => writeAll([]);
}

class MemoryOfflineSyncStore extends OfflineSyncStore {
  MemoryOfflineSyncStore() : super(file: null);

  List<Map<String, dynamic>> _items = [];

  @override
  Future<List<Map<String, dynamic>>> readAll() async {
    return _items.map((item) => Map<String, dynamic>.from(item)).toList();
  }

  @override
  Future<void> writeAll(List<Map<String, dynamic>> items) async {
    _items = items.map((item) => Map<String, dynamic>.from(item)).toList();
  }

  @override
  Future<void> clear() async {
    _items = [];
  }
}
