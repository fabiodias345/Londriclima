import 'package:flutter/material.dart';

import '../services/admin_api_client.dart';
import '../services/pdf_file_service.dart';
import '../theme/admin_theme.dart';
import 'admin_module.dart';
import 'module_filter.dart';

class ModuleScreen extends StatefulWidget {
  const ModuleScreen({
    super.key,
    required this.item,
    required this.session,
    required this.apiClient,
    this.pdfFileService = const PdfFileService(),
  });

  final DashboardItem item;
  final AdminSession session;
  final AdminApiClient apiClient;
  final PdfFileService pdfFileService;

  @override
  State<ModuleScreen> createState() => _ModuleScreenState();
}

class _ModuleScreenState extends State<ModuleScreen> {
  late Future<ModuleData> _future;
  final TextEditingController _searchController = TextEditingController();
  bool _saving = false;
  String _query = '';
  String? _selectedFilter;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<ModuleData> _load() async {
    return switch (widget.item.kind) {
      AdminModuleKind.orders => _loadOrders(),
      AdminModuleKind.schedule => _loadSchedule(),
      AdminModuleKind.clients => _loadClients(),
      AdminModuleKind.pmoc => _loadPmoc(),
      AdminModuleKind.fleet => _loadFleet(),
      AdminModuleKind.reports => _loadReports(),
      AdminModuleKind.technicians => _loadTechnicians(),
      AdminModuleKind.pending => _loadPending(),
    };
  }

  void _refresh() {
    setState(() {
      _future = _load();
    });
  }

  Future<Map<String, dynamic>> _get(String path) {
    return widget.apiClient.getJson(path, widget.session);
  }

  Future<Map<String, dynamic>> _post(
    String path, [
    Map<String, dynamic>? payload,
  ]) {
    return widget.apiClient.postJson(path, widget.session, payload);
  }

  Future<Map<String, dynamic>> _patch(
    String path,
    Map<String, dynamic> payload,
  ) {
    return widget.apiClient.patchJson(path, widget.session, payload);
  }

  List<ModuleRow> _visibleRows(ModuleData data) {
    return data.rows.where((row) {
      return FilterableModuleRow(
        searchText: row.searchText,
        filter: row.filter,
      ).matches(query: _query, selectedFilter: _selectedFilter);
    }).toList();
  }

  Future<ModuleData> _loadOrders() async {
    final data = await _get('/admin/agenda');
    final items = _asList(data['items']);
    final abertas = _countStatus(items, 'aberta');
    final andamento =
        _countStatus(items, 'em_deslocamento') +
        _countStatus(items, 'em_atendimento');
    final concluidas = _countStatus(items, 'concluida');

    return ModuleData(
      filters: const [
        ModuleFilter('Abertas', 'aberta'),
        ModuleFilter('Andamento', 'andamento'),
        ModuleFilter('Concluidas', 'concluida'),
      ],
      metrics: [
        ModuleMetric('Abertas', abertas.toString()),
        ModuleMetric('Andamento', andamento.toString()),
        ModuleMetric('Concluidas', concluidas.toString()),
      ],
      rows: items.take(30).map((item) {
        final row = _asMap(item);
        final cliente = _asMap(row['cliente']);
        final tecnico = _asMap(row['tecnico']);
        final status = _text(row['status']);
        return ModuleRow(
          title: _text(row['titulo'], fallback: 'Ordem de servico'),
          subtitle: _join([
            _text(cliente['nome']),
            _formatStatus(row['status']),
          ]),
          trailing: _formatDate(row['agendada_para'] ?? row['criada_em']),
          data: row,
          actions: _isOperational(row['status'])
              ? const [ModuleAction.reschedule]
              : const [],
          searchText: _join([
            _text(row['titulo']),
            _text(cliente['nome']),
            _text(tecnico['nome']),
            _formatStatus(status),
          ]),
          filter: _orderFilter(status),
        );
      }).toList(),
    );
  }

  Future<ModuleData> _loadSchedule() async {
    final data = await _get('/admin/agenda');
    final items = _asList(data['items']);
    final today = DateTime.now();
    final todayItems = items.where((item) {
      final date = _parseDate(_asMap(item)['agendada_para']);
      return date != null &&
          date.year == today.year &&
          date.month == today.month &&
          date.day == today.day;
    }).toList();
    final delayed = items.where((item) {
      final row = _asMap(item);
      final date = _parseDate(row['agendada_para']);
      final status = _text(row['status']);
      return date != null &&
          date.isBefore(today) &&
          status != 'concluida' &&
          status != 'cancelada';
    }).length;

    return ModuleData(
      filters: const [
        ModuleFilter('Abertas', 'aberta'),
        ModuleFilter('Andamento', 'andamento'),
        ModuleFilter('Concluidas', 'concluida'),
      ],
      metrics: [
        ModuleMetric('Hoje', todayItems.length.toString()),
        ModuleMetric('Atrasadas', delayed.toString()),
        ModuleMetric('Total', items.length.toString()),
      ],
      rows: (todayItems.isEmpty ? items : todayItems).take(30).map((item) {
        final row = _asMap(item);
        final cliente = _asMap(row['cliente']);
        final tecnico = _asMap(row['tecnico']);
        return ModuleRow(
          title: _text(row['titulo'], fallback: 'Atendimento'),
          subtitle: _join([
            _text(cliente['nome']),
            _text(tecnico['nome'], fallback: 'Sem tecnico'),
          ]),
          trailing: _formatDate(row['agendada_para']),
          data: row,
          actions: _isOperational(row['status'])
              ? const [ModuleAction.reschedule]
              : const [],
          searchText: _join([
            _text(row['titulo']),
            _text(cliente['nome']),
            _text(tecnico['nome']),
            _formatStatus(row['status']),
          ]),
          filter: _orderFilter(_text(row['status'])),
        );
      }).toList(),
    );
  }

  Future<ModuleData> _loadClients() async {
    final data = await _get('/admin/clientes');
    final items = _asList(data['items']);
    final pmoc = items
        .where((item) => _asMap(item)['pmoc_ativo'] == true)
        .length;
    final osAbertas = items.fold<int>(
      0,
      (total, item) => total + _int(_asMap(item)['os_abertas']),
    );

    return ModuleData(
      filters: const [
        ModuleFilter('PMOC', 'pmoc'),
        ModuleFilter('Avulsos', 'avulso'),
      ],
      metrics: [
        ModuleMetric('Clientes', items.length.toString()),
        ModuleMetric('PMOC', pmoc.toString()),
        ModuleMetric('O.S. abertas', osAbertas.toString()),
      ],
      rows: items.take(30).map((item) {
        final row = _asMap(item);
        return ModuleRow(
          title: _text(row['nome'], fallback: 'Cliente'),
          subtitle: _join([
            '${_int(row['total_equipamentos'])} equipamentos',
            '${_int(row['os_abertas'])} O.S. abertas',
          ]),
          trailing: row['pmoc_ativo'] == true ? 'PMOC' : 'Avulso',
          data: row,
          searchText: _join([
            _text(row['nome']),
            _text(row['email']),
            _text(row['telefone']),
          ]),
          filter: row['pmoc_ativo'] == true ? 'pmoc' : 'avulso',
        );
      }).toList(),
    );
  }

  Future<ModuleData> _loadPmoc() async {
    final data = await _get('/admin/clientes');
    final items = _asList(
      data['items'],
    ).where((item) => _asMap(item)['pmoc_ativo'] == true).toList();
    final semEngenheiro = items
        .where((item) => _asMap(item)['engenheiro_responsavel'] == null)
        .length;
    final comOs = items
        .where((item) => _int(_asMap(item)['total_os']) > 0)
        .length;

    return ModuleData(
      filters: const [
        ModuleFilter('Com engenheiro', 'com_engenheiro'),
        ModuleFilter('Sem engenheiro', 'sem_engenheiro'),
      ],
      metrics: [
        ModuleMetric('Clientes PMOC', items.length.toString()),
        ModuleMetric('Com O.S.', comOs.toString()),
        ModuleMetric('Sem eng.', semEngenheiro.toString()),
      ],
      rows: items.take(30).map((item) {
        final row = _asMap(item);
        final engenheiro = _asMap(row['engenheiro_responsavel']);
        return ModuleRow(
          title: _text(row['nome'], fallback: 'Cliente PMOC'),
          subtitle: _join([
            _text(engenheiro['nome'], fallback: 'Sem engenheiro'),
            '${_int(row['total_equipamentos'])} maquinas',
          ]),
          trailing: '${_int(row['total_os'])} O.S.',
          data: row,
          actions: const [ModuleAction.openPmocPdf, ModuleAction.resendPmoc],
          searchText: _join([_text(row['nome']), _text(engenheiro['nome'])]),
          filter: engenheiro.isEmpty ? 'sem_engenheiro' : 'com_engenheiro',
        );
      }).toList(),
    );
  }

  Future<ModuleData> _loadFleet() async {
    final data = await _get('/admin/frota/veiculos');
    final report = await _get('/admin/relatorios/frota');
    final items = _asList(data['items']);

    return ModuleData(
      filters: const [
        ModuleFilter('Ativos', 'ativo'),
        ModuleFilter('Inativos', 'inativo'),
      ],
      metrics: [
        ModuleMetric('Veiculos', items.length.toString()),
        ModuleMetric('Km', _number(report['km_rodados'])),
        ModuleMetric('Litros', _number(report['litros'])),
      ],
      rows: items.take(30).map((item) {
        final row = _asMap(item);
        return ModuleRow(
          title: _text(row['nome'], fallback: 'Veiculo'),
          subtitle: _join([
            _text(row['placa'], fallback: 'Sem placa'),
            _text(row['rastreador_imei'], fallback: 'Sem IMEI'),
          ]),
          trailing: row['ativo'] == true ? 'Ativo' : 'Inativo',
          data: row,
          searchText: _join([
            _text(row['nome']),
            _text(row['placa']),
            _text(row['rastreador_imei']),
          ]),
          filter: row['ativo'] == true ? 'ativo' : 'inativo',
          onTapAction: ModuleAction.viewFleet,
        );
      }).toList(),
    );
  }

  Future<ModuleData> _loadReports() async {
    final data = await _get('/admin/relatorios');
    final avulsos = await _get('/admin/relatorios-avulsos');
    final items = _asList(avulsos['items']);

    return ModuleData(
      filters: const [
        ModuleFilter('Prontos', 'pronto'),
        ModuleFilter('Pendentes', 'pendente'),
      ],
      metrics: [
        ModuleMetric('O.S.', _int(data['total_os']).toString()),
        ModuleMetric('Receita', _currency(data['receita_arrecadada'])),
        ModuleMetric('Avulsos', _int(avulsos['total']).toString()),
      ],
      rows: items.take(30).map((item) {
        final row = _asMap(item);
        final ready = row['pronto_para_envio'] == true;
        return ModuleRow(
          title: _text(row['nome'], fallback: 'Relatorio avulso'),
          subtitle: _join([
            '${_int(row['total_maquinas'])} maquinas',
            '${_int(row['total_os_concluidas'])} O.S. concluidas',
          ]),
          trailing: 'PDF',
          data: row,
          actions: const [ModuleAction.openReportPdf],
          searchText: _join([
            _text(row['nome']),
            _text(row['email']),
            _text(row['telefone']),
          ]),
          filter: ready ? 'pronto' : 'pendente',
        );
      }).toList(),
    );
  }

  Future<ModuleData> _loadTechnicians() async {
    final data = await _get('/admin/tecnicos');
    final items = _asList(data['items']);
    final admins = items
        .where((item) => _asMap(item)['role'] == 'admin')
        .length;
    final campo = items.length - admins;

    return ModuleData(
      filters: const [
        ModuleFilter('Campo', 'campo'),
        ModuleFilter('Admins', 'admin'),
      ],
      metrics: [
        ModuleMetric('Acessos', items.length.toString()),
        ModuleMetric('Campo', campo.toString()),
        ModuleMetric('Admins', admins.toString()),
      ],
      rows: items.take(30).map((item) {
        final row = _asMap(item);
        return ModuleRow(
          title: _text(row['nome'], fallback: 'Acesso'),
          subtitle: _join([_text(row['email']), _formatRole(row['role'])]),
          trailing: row['primeiro_acesso_pendente'] == true
              ? '1o acesso'
              : 'Ativo',
          data: row,
          searchText: _join([
            _text(row['nome']),
            _text(row['email']),
            _formatRole(row['role']),
          ]),
          filter: _text(row['role']) == 'admin' ? 'admin' : 'campo',
        );
      }).toList(),
    );
  }

  Future<ModuleData> _loadPending() async {
    final preChamados = await _get('/admin/pre-chamados');
    final relatorios = await _get('/admin/relatorios');
    final items = _asList(preChamados['items']);
    final automacoes = _int(relatorios['automacoes_pendentes']);

    return ModuleData(
      filters: const [
        ModuleFilter('Pre-chamados', 'pre_chamado'),
        ModuleFilter('Automacoes', 'automacao'),
      ],
      metrics: [
        ModuleMetric('Pre-chamados', items.length.toString()),
        ModuleMetric('Automacoes', automacoes.toString()),
        ModuleMetric('Urgentes', (items.length + automacoes).toString()),
      ],
      rows: [
        ...items.take(30).map((item) {
          final row = _asMap(item);
          final cliente = _asMap(row['cliente']);
          return ModuleRow(
            title: _text(row['titulo'], fallback: 'Pre-chamado'),
            subtitle: _join([_text(cliente['nome']), _text(row['detalhes'])]),
            trailing: _formatDate(row['criado_em']),
            data: row,
            actions: const [ModuleAction.approve, ModuleAction.reject],
            searchText: _join([
              _text(row['titulo']),
              _text(cliente['nome']),
              _text(row['detalhes']),
            ]),
            filter: 'pre_chamado',
          );
        }),
        if (automacoes > 0)
          ModuleRow(
            title: 'Automacoes pendentes',
            subtitle: 'Fila do backend aguardando execucao',
            trailing: automacoes.toString(),
            searchText: 'Automacoes pendentes fila backend',
            filter: 'automacao',
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.item.title),
        actions: [
          IconButton(
            tooltip: 'Atualizar',
            onPressed: _refresh,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      floatingActionButton: _canCreateOrder
          ? FloatingActionButton.extended(
              onPressed: _saving ? null : () => _showOrderForm(),
              icon: const Icon(Icons.add),
              label: const Text('Nova O.S.'),
            )
          : null,
      body: SafeArea(
        child: FutureBuilder<ModuleData>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }

            if (snapshot.hasError) {
              final message =
                  snapshot.error is AdminRequestException &&
                      (snapshot.error! as AdminRequestException).failure ==
                          AdminRequestFailure.network
                  ? 'Sem conexao com o servidor.'
                  : 'Nao foi possivel carregar os dados.';
              return _StateMessage(
                icon: Icons.cloud_off_outlined,
                title: message,
                action: _refresh,
              );
            }

            final data =
                snapshot.data ?? const ModuleData(metrics: [], rows: []);
            final visibleRows = _visibleRows(data);
            return RefreshIndicator(
              onRefresh: () async => _refresh(),
              child: ListView(
                padding: const EdgeInsets.all(18),
                children: [
                  _ModuleHero(item: widget.item),
                  const SizedBox(height: 14),
                  _MetricsGrid(metrics: data.metrics, color: widget.item.color),
                  const SizedBox(height: 14),
                  TextField(
                    key: const Key('module-search'),
                    controller: _searchController,
                    onChanged: (value) => setState(() => _query = value),
                    decoration: InputDecoration(
                      hintText: 'Buscar em ${widget.item.title}',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: _query.isEmpty
                          ? null
                          : IconButton(
                              tooltip: 'Limpar busca',
                              onPressed: () {
                                FocusScope.of(context).unfocus();
                                _searchController.clear();
                                setState(() => _query = '');
                              },
                              icon: const Icon(Icons.close),
                            ),
                    ),
                  ),
                  if (data.filters.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: data.filters.map((filter) {
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: FilterChip(
                              label: Text(filter.label),
                              selected: _selectedFilter == filter.value,
                              onSelected: (selected) {
                                setState(() {
                                  _selectedFilter = selected
                                      ? filter.value
                                      : null;
                                });
                              },
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ],
                  const SizedBox(height: 14),
                  if (visibleRows.isEmpty)
                    const _StateMessage(
                      icon: Icons.search_off_outlined,
                      title: 'Nenhum resultado encontrado.',
                    )
                  else
                    ...visibleRows.map(
                      (row) => _DataTile(
                        row: row,
                        color: widget.item.color,
                        onAction: _saving
                            ? null
                            : (action) => _handleAction(action, row),
                      ),
                    ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  bool get _canCreateOrder {
    return widget.item.kind == AdminModuleKind.orders ||
        widget.item.kind == AdminModuleKind.schedule;
  }

  Future<void> _handleAction(ModuleAction action, ModuleRow row) async {
    switch (action) {
      case ModuleAction.reschedule:
        await _showOrderForm(existingOrder: row.data);
      case ModuleAction.approve:
        await _confirmAndRun(
          title: 'Aprovar solicitacao?',
          message: row.title,
          success: 'Solicitacao aprovada.',
          run: () => _patch('/admin/pre-chamados/${row.id}/aprovar', const {}),
        );
      case ModuleAction.reject:
        await _confirmAndRun(
          title: 'Rejeitar solicitacao?',
          message: row.title,
          success: 'Solicitacao rejeitada.',
          run: () => _patch('/admin/pre-chamados/${row.id}/rejeitar', const {}),
        );
      case ModuleAction.resendPmoc:
        await _confirmAndRun(
          title: 'Reenviar assinatura PMOC?',
          message: row.title,
          success: 'Assinatura PMOC solicitada.',
          run: () =>
              _post('/admin/pmoc/clientes/${row.id}/assinatura-engenheiro'),
        );
      case ModuleAction.openPmocPdf:
        await _openPdf('/admin/pmoc/clientes/${row.id}/pdf');
      case ModuleAction.openReportPdf:
        await _openPdf('/admin/relatorios-avulsos/clientes/${row.id}/pdf');
      case ModuleAction.viewFleet:
        await _showFleetDetails(row);
    }
  }

  Future<void> _openPdf(String path) async {
    setState(() => _saving = true);
    try {
      final file = await widget.apiClient.downloadBytes(path, widget.session);
      await widget.pdfFileService.open(file);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nao foi possivel abrir o PDF.')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _showFleetDetails(ModuleRow row) {
    return showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => _FleetDetails(data: row.data),
    );
  }

  Future<void> _confirmAndRun({
    required String title,
    required String message,
    required String success,
    required Future<void> Function() run,
  }) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Confirmar'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;
    await _runSaving(run, success);
  }

  Future<void> _runSaving(Future<void> Function() run, String success) async {
    setState(() => _saving = true);
    try {
      await run();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(success)));
      _refresh();
    } on AdminRequestException catch (error) {
      if (!mounted) return;
      final message = error.failure == AdminRequestFailure.network
          ? 'Sem conexao com o servidor.'
          : 'Nao foi possivel concluir a acao.';
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _showOrderForm({Map<String, dynamic>? existingOrder}) async {
    final isEditing = existingOrder != null;
    final options = await _loadOrderOptions();
    if (!mounted) return;

    String? clientId = _text(_asMap(existingOrder?['cliente'])['id']);
    String? technicianId = _text(_asMap(existingOrder?['tecnico'])['id']);
    DateTime? scheduledAt = _parseDate(existingOrder?['agendada_para']);
    final titleController = TextEditingController(
      text: _text(existingOrder?['titulo']),
    );
    final detailsController = TextEditingController(
      text: _text(existingOrder?['detalhes']),
    );

    final payload = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            title: Text(isEditing ? 'Reprogramar O.S.' : 'Nova O.S.'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (!isEditing)
                    DropdownButtonFormField<String>(
                      initialValue: clientId?.isEmpty == true ? null : clientId,
                      isExpanded: true,
                      decoration: const InputDecoration(labelText: 'Cliente'),
                      items: options.clients.map((client) {
                        return DropdownMenuItem(
                          value: client.id,
                          child: Text(
                            client.name,
                            overflow: TextOverflow.ellipsis,
                          ),
                        );
                      }).toList(),
                      onChanged: (value) =>
                          setDialogState(() => clientId = value),
                    ),
                  if (!isEditing) const SizedBox(height: 12),
                  TextField(
                    controller: titleController,
                    decoration: const InputDecoration(labelText: 'Titulo'),
                    textInputAction: TextInputAction.next,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: detailsController,
                    decoration: const InputDecoration(labelText: 'Detalhes'),
                    minLines: 2,
                    maxLines: 3,
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: technicianId?.isEmpty == true
                        ? null
                        : technicianId,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Tecnico'),
                    items: [
                      const DropdownMenuItem(
                        value: '',
                        child: Text('Sem tecnico'),
                      ),
                      ...options.technicians.map((technician) {
                        return DropdownMenuItem(
                          value: technician.id,
                          child: Text(
                            technician.name,
                            overflow: TextOverflow.ellipsis,
                          ),
                        );
                      }),
                    ],
                    onChanged: (value) =>
                        setDialogState(() => technicianId = value),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () async {
                      final picked = await _pickDateTime(scheduledAt);
                      if (picked == null) return;
                      setDialogState(() => scheduledAt = picked);
                    },
                    icon: const Icon(Icons.event),
                    label: Text(
                      scheduledAt == null
                          ? 'Definir data'
                          : _formatDateTime(scheduledAt!),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Cancelar'),
              ),
              FilledButton(
                onPressed: () {
                  final title = titleController.text.trim();
                  if (title.isEmpty ||
                      (!isEditing && (clientId == null || clientId!.isEmpty))) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Informe cliente e titulo.'),
                      ),
                    );
                    return;
                  }

                  final data = <String, dynamic>{
                    'titulo': title,
                    'detalhes': detailsController.text.trim(),
                    'agendada_para': scheduledAt?.toUtc().toIso8601String(),
                    'tecnico_id': technicianId?.isEmpty == true
                        ? null
                        : technicianId,
                  };
                  if (!isEditing) data['cliente_id'] = clientId;
                  data.removeWhere((_, value) => value == null);
                  Navigator.of(context).pop(data);
                },
                child: Text(isEditing ? 'Salvar' : 'Criar'),
              ),
            ],
          );
        },
      ),
    );

    titleController.dispose();
    detailsController.dispose();
    if (payload == null) return;

    await _runSaving(() async {
      if (isEditing) {
        await _patch(
          '/admin/agenda/ordens/${_text(existingOrder['id'])}',
          payload,
        );
      } else {
        await _post('/admin/agenda/ordens', payload);
      }
    }, isEditing ? 'O.S. reprogramada.' : 'O.S. criada.');
  }

  Future<AdminOrderOptions> _loadOrderOptions() async {
    final clientsData = await _get('/admin/clientes');
    final techniciansData = await _get('/admin/tecnicos');
    return AdminOrderOptions(
      clients: _asList(clientsData['items'])
          .map((item) {
            final row = _asMap(item);
            return AdminOption(
              _text(row['id']),
              _text(row['nome'], fallback: 'Cliente'),
            );
          })
          .where((item) => item.id.isNotEmpty)
          .toList(),
      technicians: _asList(techniciansData['items'])
          .where((item) {
            return _text(_asMap(item)['role']) != 'admin';
          })
          .map((item) {
            final row = _asMap(item);
            return AdminOption(
              _text(row['id']),
              _text(row['nome'], fallback: 'Tecnico'),
            );
          })
          .where((item) => item.id.isNotEmpty)
          .toList(),
    );
  }

  Future<DateTime?> _pickDateTime(DateTime? initial) async {
    final base = initial ?? DateTime.now().add(const Duration(hours: 1));
    final date = await showDatePicker(
      context: context,
      initialDate: base,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 730)),
    );
    if (date == null || !mounted) return null;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(base),
    );
    if (time == null) return null;
    return DateTime(date.year, date.month, date.day, time.hour, time.minute);
  }
}

class ModuleData {
  const ModuleData({
    required this.metrics,
    required this.rows,
    this.filters = const [],
  });

  final List<ModuleMetric> metrics;
  final List<ModuleRow> rows;
  final List<ModuleFilter> filters;
}

class ModuleFilter {
  const ModuleFilter(this.label, this.value);

  final String label;
  final String value;
}

class ModuleMetric {
  const ModuleMetric(this.label, this.value);

  final String label;
  final String value;
}

enum ModuleAction {
  reschedule,
  approve,
  reject,
  resendPmoc,
  openPmocPdf,
  openReportPdf,
  viewFleet,
}

class ModuleRow {
  const ModuleRow({
    required this.title,
    required this.subtitle,
    required this.trailing,
    this.data = const {},
    this.actions = const [],
    this.searchText = '',
    this.filter,
    this.onTapAction,
  });

  final String title;
  final String subtitle;
  final String trailing;
  final Map<String, dynamic> data;
  final List<ModuleAction> actions;
  final String searchText;
  final String? filter;
  final ModuleAction? onTapAction;

  String get id => _text(data['id']);
}

class AdminOption {
  const AdminOption(this.id, this.name);

  final String id;
  final String name;
}

class AdminOrderOptions {
  const AdminOrderOptions({required this.clients, required this.technicians});

  final List<AdminOption> clients;
  final List<AdminOption> technicians;
}

class _ModuleHero extends StatelessWidget {
  const _ModuleHero({required this.item});

  final DashboardItem item;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: item.color,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          Icon(item.icon, color: Colors.white, size: 38),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  item.subtitle,
                  style: const TextStyle(
                    color: Color(0xFFF3F7FB),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MetricsGrid extends StatelessWidget {
  const _MetricsGrid({required this.metrics, required this.color});

  final List<ModuleMetric> metrics;
  final Color color;

  @override
  Widget build(BuildContext context) {
    if (metrics.isEmpty) return const SizedBox.shrink();
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth < 340 ? 1 : metrics.length;
        final spacing = 6.0;
        final width =
            (constraints.maxWidth - spacing * (columns - 1)) / columns;
        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: metrics.map((metric) {
            return SizedBox(
              width: width,
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: color.withValues(alpha: 0.20)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      metric.value,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: color,
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      metric.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: adminSlate,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        );
      },
    );
  }
}

class _DataTile extends StatelessWidget {
  const _DataTile({
    required this.row,
    required this.color,
    required this.onAction,
  });

  final ModuleRow row;
  final Color color;
  final void Function(ModuleAction action)? onAction;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: adminBorder),
      ),
      child: ListTile(
        dense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
        onTap: row.onTapAction == null || onAction == null
            ? null
            : () => onAction!(row.onTapAction!),
        leading: CircleAvatar(
          backgroundColor: color.withValues(alpha: 0.12),
          child: Icon(
            row.onTapAction == null
                ? Icons.description_outlined
                : Icons.chevron_right,
            color: color,
          ),
        ),
        title: Text(
          row.title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        subtitle: Text(
          row.subtitle,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: row.actions.isEmpty
            ? Text(
                row.trailing,
                textAlign: TextAlign.right,
                style: const TextStyle(
                  color: adminSlate,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              )
            : PopupMenuButton<ModuleAction>(
                enabled: onAction != null,
                tooltip: 'Acoes',
                onSelected: onAction,
                itemBuilder: (context) => row.actions.map((action) {
                  return PopupMenuItem(
                    value: action,
                    child: Text(_actionLabel(action)),
                  );
                }).toList(),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      row.trailing,
                      style: const TextStyle(
                        color: adminSlate,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const Icon(Icons.more_vert),
                  ],
                ),
              ),
      ),
    );
  }
}

class _FleetDetails extends StatelessWidget {
  const _FleetDetails({required this.data});

  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final details = <(String, String)>[
      ('Nome', _text(data['nome'], fallback: 'Nao informado')),
      ('Placa', _text(data['placa'], fallback: 'Nao informada')),
      (
        'Rastreador IMEI',
        _text(data['rastreador_imei'], fallback: 'Nao informado'),
      ),
      ('Status', data['ativo'] == true ? 'Ativo' : 'Inativo'),
    ];

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Detalhes do veiculo',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 12),
            ...details.map(
              (detail) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 118,
                      child: Text(
                        detail.$1,
                        style: const TextStyle(
                          color: adminSlate,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    Expanded(
                      child: Text(
                        detail.$2,
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StateMessage extends StatelessWidget {
  const _StateMessage({required this.icon, required this.title, this.action});

  final IconData icon;
  final String title;
  final VoidCallback? action;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: adminSlate, size: 44),
            const SizedBox(height: 10),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: adminSlate,
                fontWeight: FontWeight.w800,
              ),
            ),
            if (action != null) ...[
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: action,
                icon: const Icon(Icons.refresh),
                label: const Text('Tentar novamente'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

List<dynamic> _asList(Object? value) => value is List ? value : const [];

Map<String, dynamic> _asMap(Object? value) {
  return value is Map<String, dynamic> ? value : const {};
}

String _text(Object? value, {String fallback = ''}) {
  final text = value?.toString().trim() ?? '';
  return text.isEmpty ? fallback : text;
}

int _int(Object? value) {
  if (value is int) return value;
  if (value is num) return value.round();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

int _countStatus(List<dynamic> items, String status) {
  return items.where((item) => _asMap(item)['status'] == status).length;
}

String _join(List<String> parts) {
  return parts.where((part) => part.trim().isNotEmpty).join(' - ');
}

DateTime? _parseDate(Object? value) {
  final text = value?.toString();
  return text == null || text.isEmpty
      ? null
      : DateTime.tryParse(text)?.toLocal();
}

String _formatDate(Object? value) {
  final date = _parseDate(value);
  if (date == null) return '';
  final day = date.day.toString().padLeft(2, '0');
  final month = date.month.toString().padLeft(2, '0');
  final hour = date.hour.toString().padLeft(2, '0');
  final minute = date.minute.toString().padLeft(2, '0');
  return '$day/$month $hour:$minute';
}

String _formatDateTime(DateTime date) {
  final day = date.day.toString().padLeft(2, '0');
  final month = date.month.toString().padLeft(2, '0');
  final year = date.year.toString();
  final hour = date.hour.toString().padLeft(2, '0');
  final minute = date.minute.toString().padLeft(2, '0');
  return '$day/$month/$year $hour:$minute';
}

String _formatStatus(Object? value) {
  return switch (_text(value)) {
    'aberta' => 'Aberta',
    'em_deslocamento' => 'Deslocamento',
    'em_atendimento' => 'Atendimento',
    'concluida' => 'Concluida',
    'cancelada' => 'Cancelada',
    'rejeitada' => 'Rejeitada',
    'pre_chamado' => 'Pre-chamado',
    final status => status,
  };
}

bool _isOperational(Object? status) {
  return switch (_text(status)) {
    'aberta' || 'em_deslocamento' || 'em_atendimento' => true,
    _ => false,
  };
}

String _orderFilter(String status) {
  return switch (status) {
    'em_deslocamento' || 'em_atendimento' => 'andamento',
    _ => status,
  };
}

String _actionLabel(ModuleAction action) {
  return switch (action) {
    ModuleAction.reschedule => 'Reprogramar',
    ModuleAction.approve => 'Aprovar',
    ModuleAction.reject => 'Rejeitar',
    ModuleAction.resendPmoc => 'Reenviar assinatura',
    ModuleAction.openPmocPdf => 'Abrir PDF',
    ModuleAction.openReportPdf => 'Abrir PDF',
    ModuleAction.viewFleet => 'Ver detalhes',
  };
}

String _formatRole(Object? value) {
  return switch (_text(value)) {
    'admin' => 'Admin',
    'tecnico' => 'Tecnico',
    'auxiliar' => 'Auxiliar',
    final role => role,
  };
}

String _number(Object? value) {
  if (value is num) return value.round().toString();
  return _int(value).toString();
}

String _currency(Object? value) {
  final number = value is num
      ? value
      : num.tryParse(value?.toString() ?? '') ?? 0;
  return 'R\$ ${number.toStringAsFixed(0)}';
}
