import 'package:flutter/material.dart';
import '../models/levantamento.dart';
import '../models/work_order.dart';
import '../repositories/levantamento_repository.dart';
import '../services/checklist_photo_picker.dart';
import 'levantamento_detail_screen.dart';

class LevantamentosScreen extends StatefulWidget { const LevantamentosScreen({super.key, required this.repository, required this.photoPicker}); final LevantamentoRepository repository; final ChecklistPhotoPicker photoPicker; @override State<LevantamentosScreen> createState() => _LevantamentosScreenState(); }
class _LevantamentosScreenState extends State<LevantamentosScreen> {
  late Future<List<Levantamento>> future;
  @override void initState() { super.initState(); future = widget.repository.listMine(); }
  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Levantamentos')), body: FutureBuilder<List<Levantamento>>(future: future, builder: (context, snapshot) { if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator()); final items = snapshot.data ?? const <Levantamento>[]; if (items.isEmpty) return const Center(child: Text('Nenhum levantamento pendente.')); return RefreshIndicator(onRefresh: () async => setState(() => future = widget.repository.listMine()), child: ListView.separated(padding: const EdgeInsets.all(16), itemCount: items.length, separatorBuilder: (_, _) => const SizedBox(height: 10), itemBuilder: (_, index) { final item = items[index]; return Card(child: ListTile(contentPadding: const EdgeInsets.all(16), title: Text(item.clientName, style: const TextStyle(fontWeight: FontWeight.w900)), subtitle: Text('${item.type.label}\n${item.problem}'), isThreeLine: true, trailing: const Icon(Icons.chevron_right), onTap: () async { await Navigator.push(context, MaterialPageRoute(builder: (_) => LevantamentoDetailScreen(item: item, repository: widget.repository, photoPicker: widget.photoPicker))); if (mounted) setState(() => future = widget.repository.listMine()); })); })); }) );
}
