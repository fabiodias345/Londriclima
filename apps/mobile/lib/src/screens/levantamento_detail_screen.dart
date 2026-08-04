import 'package:flutter/material.dart';
import '../models/levantamento.dart';
import '../models/work_order.dart';
import '../repositories/levantamento_repository.dart';
import '../services/checklist_photo_picker.dart';

class LevantamentoDetailScreen extends StatefulWidget {
  const LevantamentoDetailScreen({super.key, required this.item, required this.repository, required this.photoPicker});
  final Levantamento item;
  final LevantamentoRepository repository;
  final ChecklistPhotoPicker photoPicker;
  @override State<LevantamentoDetailScreen> createState() => _LevantamentoDetailScreenState();
}

class _LevantamentoDetailScreenState extends State<LevantamentoDetailScreen> {
  late final TextEditingController diagnosis = TextEditingController(text: widget.item.diagnosis);
  late final TextEditingController cause = TextEditingController(text: widget.item.cause);
  late final TextEditingController services = TextEditingController(text: widget.item.recommendedServices);
  late final TextEditingController notes = TextEditingController(text: widget.item.notes);
  bool saving = false;

  @override void dispose() { diagnosis.dispose(); cause.dispose(); services.dispose(); notes.dispose(); super.dispose(); }
  LevantamentoDraft get draft => LevantamentoDraft(diagnosis: diagnosis.text, cause: cause.text, recommendedServices: services.text, notes: notes.text);

  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Levantamento técnico')), body: ListView(padding: const EdgeInsets.all(18), children: [
    Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(widget.item.clientName, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)), if (widget.item.address.isNotEmpty) Text(widget.item.address), const SizedBox(height: 12), Chip(label: Text(widget.item.type.label)), const SizedBox(height: 8), Text(widget.item.problem)]))),
    const SizedBox(height: 16), _field('Diagnóstico', diagnosis, 4), _field('Causa provável', cause, 3), _field('Serviços recomendados', services, 3), _field('Observações', notes, 3),
    const SizedBox(height: 8), OutlinedButton.icon(onPressed: saving ? null : _photo, icon: const Icon(Icons.camera_alt_outlined), label: const Text('Adicionar foto')), const SizedBox(height: 12),
    FilledButton(onPressed: saving ? null : () => _save(false), child: Text(saving ? 'Salvando...' : 'Salvar rascunho')), const SizedBox(height: 10),
    FilledButton.tonal(onPressed: saving ? null : () => _finish('precisa_orcamento'), child: const Text('Finalizar e solicitar orçamento')), const SizedBox(height: 10),
    OutlinedButton(onPressed: saving ? null : () => _finish('resolvido_na_visita'), child: const Text('Finalizar como resolvido na visita')),
  ]));

  Widget _field(String label, TextEditingController controller, int lines) => Padding(padding: const EdgeInsets.only(bottom: 12), child: TextField(controller: controller, maxLines: lines, decoration: InputDecoration(labelText: label, alignLabelWithHint: true)));
  Future<void> _photo() async { final photo = await widget.photoPicker.pickPhoto(); if (photo == null || !mounted) return; setState(() => saving = true); try { await widget.repository.uploadPhoto(widget.item, photo); if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Foto enviada.'))); } finally { if (mounted) setState(() => saving = false); } }
  Future<void> _save(bool finish) async { setState(() => saving = true); try { final updated = await widget.repository.saveDraft(widget.item, draft); if (mounted && !finish) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Rascunho salvo.'))); Navigator.pop(context, updated); } } finally { if (mounted) setState(() => saving = false); } }
  Future<void> _finish(String decision) async { setState(() => saving = true); try { final updated = await widget.repository.finish(widget.item, draft, decision); if (mounted) Navigator.pop(context, updated); } finally { if (mounted) setState(() => saving = false); } }
}
