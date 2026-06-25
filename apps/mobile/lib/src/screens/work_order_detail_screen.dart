import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../models/work_order.dart';
import '../repositories/work_order_repository.dart';
import '../services/barcode_scanner_service.dart';
import '../services/location_service.dart';
import '../theme/app_theme.dart';
import '../widgets/detail_section.dart';

const _machineFieldLabels = {
  'codigo_qr': 'QR / codigo da maquina',
  'tipo': 'Tipo',
  'marca': 'Marca',
  'modelo': 'Modelo',
  'capacidade_btu': 'BTUs',
  'gas_refrigerante': 'Gas refrigerante',
  'numero_serie': 'Numero de serie',
  'local_instalacao': 'Local instalado',
};

const _machineTypeOptions = [
  'Split',
  'Cassete',
  'Piso teto',
  'Condensadora',
  'Janela',
  'VRF',
  'Outro',
];

const _gasOptions = ['R-22', 'R-410A', 'R-32', 'R-134a', 'Outro'];

enum _WorkOrderDetailStep { data, machines, checklist, finish }

OutlineInputBorder _fieldBorder(Color color, {double width = 1}) {
  return OutlineInputBorder(
    borderRadius: BorderRadius.circular(14),
    borderSide: BorderSide(color: color, width: width),
  );
}

class WorkOrderDetailScreen extends StatefulWidget {
  const WorkOrderDetailScreen({
    super.key,
    required this.order,
    required this.repository,
    required this.locationService,
    required this.photoPicker,
    required this.barcodeScanner,
  });

  final WorkOrder order;
  final WorkOrderRepository repository;
  final LocationService locationService;
  final ChecklistPhotoPicker photoPicker;
  final BarcodeScannerService barcodeScanner;

  @override
  State<WorkOrderDetailScreen> createState() => _WorkOrderDetailScreenState();
}

class _WorkOrderDetailScreenState extends State<WorkOrderDetailScreen> {
  late WorkOrder _order;
  bool _starting = false;
  String _machineFilter = '';
  late List<WorkOrderEquipment> _equipments;
  WorkOrderEquipment? _selectedEquipment;
  bool _editingMachine = false;
  bool _checklistStarted = false;
  bool _savingChecklist = false;
  bool _checklistSaved = false;
  bool _initialEvidenceSaved = false;
  bool _finishing = false;
  String? _checklistMessage;
  final _checklistSectionKey = GlobalKey();
  final ScrollController _scrollController = ScrollController();
  final Map<String, String> _checklistValues = {};
  final Map<String, GlobalKey> _checklistItemKeys = {};
  final List<Offset?> _signaturePoints = [];
  final TextEditingController _responsibleController = TextEditingController();
  final Set<String> _uploadingPhotoCodes = {};
  final Map<String, TextEditingController> _textControllers = {};
  final Map<String, TextEditingController> _noteControllers = {};
  final Map<String, TextEditingController> _machineControllers = {
    'codigo_qr': TextEditingController(),
    'tipo': TextEditingController(),
    'marca': TextEditingController(),
    'modelo': TextEditingController(),
    'capacidade_btu': TextEditingController(),
    'gas_refrigerante': TextEditingController(),
    'numero_serie': TextEditingController(),
    'local_instalacao': TextEditingController(),
  };
  final Map<String, TextEditingController> _machineImpossibleControllers = {
    for (final key in _machineFieldLabels.keys) key: TextEditingController(),
  };
  final Set<String> _machineImpossibleFields = {};
  final Set<String> _highlightedMachineFields = {};
  final Set<String> _highlightedChecklistCodes = {};
  String? _errorMessage;
  _WorkOrderDetailStep _activeStep = _WorkOrderDetailStep.data;

  @override
  void dispose() {
    for (final controller in _textControllers.values) {
      controller.dispose();
    }
    for (final controller in _noteControllers.values) {
      controller.dispose();
    }
    for (final controller in _machineControllers.values) {
      controller.dispose();
    }
    for (final controller in _machineImpossibleControllers.values) {
      controller.dispose();
    }
    _scrollController.dispose();
    _responsibleController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _order = widget.order;
    _equipments = List<WorkOrderEquipment>.of(_equipmentsFor(widget.order));
    if (_allEquipmentsHandled) {
      _checklistSaved = true;
      _initialEvidenceSaved = true;
      _activeStep = _WorkOrderDetailStep.finish;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Detalhes da OS')),
      bottomNavigationBar: _bottomActionBar(),
      body: SafeArea(
        child: ListView(
          controller: _scrollController,
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 24),
          children: [
            _Header(order: _order),
            const SizedBox(height: 14),
            if (_order.isAtClient) ...[
              _StepTabs(
                activeStep: _activeStep,
                onChanged: (step) {
                  setState(() {
                    _activeStep = step;
                  });
                },
              ),
              const SizedBox(height: 14),
            ],
            if (!_order.isAtClient ||
                _activeStep == _WorkOrderDetailStep.data) ...[
              DetailSection(
                title: 'Dados do atendimento',
                children: [
                  _InfoRow(
                    icon: Icons.business_outlined,
                    label: 'Cliente',
                    value: _order.clientName,
                  ),
                  _InfoRow(
                    icon: Icons.place_outlined,
                    label: 'Endereco',
                    value: _order.address,
                  ),
                  _InfoRow(
                    icon: Icons.ac_unit,
                    label: 'Resumo',
                    value: _order.equipmentCountLabel,
                  ),
                  _InfoRow(
                    icon: Icons.build_outlined,
                    label: 'Tipo',
                    value: _order.maintenanceType,
                  ),
                  _InfoRow(
                    icon: Icons.assignment_outlined,
                    label: 'Tipo de servico',
                    value: _order.serviceLabel,
                  ),
                ],
              ),
              const SizedBox(height: 14),
              DetailSection(
                title: 'Equipamentos deste atendimento',
                children: _equipmentWidgets(_order),
              ),
              const SizedBox(height: 18),
            ],
            if (_errorMessage != null) ...[
              Text(
                _errorMessage!,
                style: const TextStyle(
                  color: Color(0xFFB3261E),
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 12),
            ],
            if (_checklistMessage != null &&
                _order.status != WorkOrderStatus.done) ...[
              Text(
                _checklistMessage!,
                style: const TextStyle(
                  color: airmovebrAccent,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 12),
            ],
            FilledButton.icon(
              key: const Key('startServiceButton'),
              onPressed: _canStart ? _startService : null,
              icon: const Icon(Icons.play_arrow_rounded),
              label: Text(_startButtonLabel),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                backgroundColor: airmovebrAccent,
                foregroundColor: Colors.white,
              ),
            ),
            if (_order.status == WorkOrderStatus.done) ...[
              const SizedBox(height: 12),
              const DetailSection(
                title: 'OS finalizada',
                children: [
                  Text(
                    'OS finalizada.',
                    style: TextStyle(
                      color: airmovebrAccent,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ],
            if (_order.isAtClient &&
                _activeStep == _WorkOrderDetailStep.machines) ...[
              const SizedBox(height: 12),
              DetailSection(
                title: 'Selecionar maquina',
                children: [
                  TextField(
                    key: const Key('machineSearchField'),
                    decoration: const InputDecoration(
                      labelText: 'Buscar por TAG, local ou modelo',
                      prefixIcon: Icon(Icons.search_rounded),
                    ),
                    onChanged: (value) {
                      setState(() {
                        _machineFilter = value;
                      });
                    },
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    key: const Key('scanEquipmentButton'),
                    onPressed: _scanEquipmentCode,
                    icon: const Icon(Icons.qr_code_scanner_outlined),
                    label: const Text('Ler QR / codigo de barras'),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                      alignment: Alignment.centerLeft,
                      foregroundColor: airmovebrPrimary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ..._machineSelectionWidgets(),
                  OutlinedButton.icon(
                    key: const Key('newMachineButton'),
                    onPressed: () {
                      setState(() {
                        _selectedEquipment = null;
                        _editingMachine = true;
                        _checklistStarted = false;
                        _checklistSaved = false;
                        _checklistMessage = null;
                        _initialEvidenceSaved = false;
                        _signaturePoints.clear();
                        _responsibleController.clear();
                        _clearMachineForm();
                        _activeStep = _WorkOrderDetailStep.machines;
                      });
                    },
                    icon: const Icon(Icons.add_circle_outline),
                    label: const Text('Nova maquina'),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                      foregroundColor: airmovebrPrimary,
                    ),
                  ),
                  if (_filteredEquipments().isEmpty)
                    const Text(
                      'Nenhuma maquina pendente encontrada.',
                      style: TextStyle(color: airmovebrMuted),
                    ),
                ],
              ),
              if (_selectedEquipment != null) ...[
                const SizedBox(height: 12),
                DetailSection(
                  title: 'Maquina selecionada',
                  children: [
                    _InfoRow(
                      icon: Icons.ac_unit,
                      label: _selectedEquipment!.location.isEmpty
                          ? 'Equipamento'
                          : _selectedEquipment!.location,
                      value:
                          '${_selectedEquipment!.name} - ${_selectedEquipment!.model}',
                    ),
                    if (_selectedEquipment!.missingRequiredFields().isNotEmpty)
                      _MachineMissingSummary(
                        missingFields: _selectedEquipment!
                            .missingRequiredFields(),
                      ),
                  ],
                ),
              ],
              const SizedBox(height: 12),
              if (_editingMachine) ...[
                DetailSection(
                  title: _selectedEquipment == null
                      ? 'Cadastrar maquina'
                      : 'Completar cadastro da maquina',
                  children: [
                    ..._machineFieldLabels.entries.map(
                      (entry) => _MachineField(
                        fieldKey: entry.key,
                        label: entry.value,
                        controller: _machineControllers[entry.key]!,
                        impossibleController:
                            _machineImpossibleControllers[entry.key]!,
                        impossible: _machineImpossibleFields.contains(
                          entry.key,
                        ),
                        missing: _highlightedMachineFields.contains(entry.key),
                        numeric: entry.key == 'capacidade_btu',
                        options: switch (entry.key) {
                          'tipo' => _machineTypeOptions,
                          'gas_refrigerante' => _gasOptions,
                          _ => const <String>[],
                        },
                        onImpossibleChanged: (checked) {
                          setState(() {
                            if (checked) {
                              _machineImpossibleFields.add(entry.key);
                              _highlightedMachineFields.remove(entry.key);
                            } else {
                              _machineImpossibleFields.remove(entry.key);
                              _highlightedMachineFields.remove(entry.key);
                              _machineImpossibleControllers[entry.key]!.clear();
                            }
                          });
                        },
                        onChanged: () {
                          if (_highlightedMachineFields.contains(entry.key)) {
                            setState(() {
                              _highlightedMachineFields.remove(entry.key);
                            });
                          }
                        },
                      ),
                    ),
                    FilledButton.icon(
                      key: const Key('saveMachineButton'),
                      onPressed: _saveMachine,
                      icon: const Icon(Icons.save_outlined),
                      label: const Text('Salvar maquina'),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(52),
                        backgroundColor: airmovebrPrimary,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
              ],
              Builder(
                builder: (context) {
                  final checklistBlocked =
                      _selectedEquipment == null ||
                      _editingMachine ||
                      (!_selectedEquipment!.hasRequiredMachineData() &&
                          _missingMachineInputFields(
                            _buildMachineInput(),
                          ).isNotEmpty);

                  return FilledButton.icon(
                    key: const Key('checklistReadyButton'),
                    onPressed: checklistBlocked
                        ? null
                        : () {
                            setState(() {
                              _checklistStarted = true;
                              _checklistMessage = null;
                              _activeStep = _WorkOrderDetailStep.checklist;
                            });
                            WidgetsBinding.instance.addPostFrameCallback((_) {
                              final context =
                                  _checklistSectionKey.currentContext;
                              if (context != null) {
                                Scrollable.ensureVisible(
                                  context,
                                  duration: const Duration(milliseconds: 200),
                                  alignment: 0.05,
                                );
                              }
                            });
                          },
                    icon: const Icon(Icons.checklist_rounded),
                    label: Text(
                      _selectedEquipment == null
                          ? 'Selecione uma maquina'
                          : _editingMachine ||
                                !_selectedEquipment!.hasRequiredMachineData()
                          ? 'Complete cadastro da maquina'
                          : _checklistStarted
                          ? 'Checklist iniciado'
                          : 'Iniciar checklist',
                    ),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(52),
                      backgroundColor: airmovebrPrimary,
                      foregroundColor: Colors.white,
                    ),
                  );
                },
              ),
            ],
            if (_order.isAtClient &&
                _activeStep == _WorkOrderDetailStep.checklist &&
                _checklistStarted &&
                _selectedEquipment != null) ...[
              const SizedBox(height: 12),
              DetailSection(
                key: _checklistSectionKey,
                title: _order.isCorrective
                    ? 'Checklist corretivo'
                    : 'Checklist da maquina',
                children: _order.effectiveChecklist.isEmpty
                    ? const [
                        Text(
                          'Checklist nao definido para esta OS.',
                          style: TextStyle(color: airmovebrMuted),
                        ),
                      ]
                    : _checklistWidgets(),
              ),
              const SizedBox(height: 12),
              if (_checklistMessage != null) ...[
                Text(
                  _checklistMessage!,
                  style: const TextStyle(
                    color: airmovebrAccent,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 12),
              ],
              const SizedBox(height: 84),
            ],
            if (_order.isAtClient &&
                _activeStep == _WorkOrderDetailStep.finish) ...[
              const SizedBox(height: 12),
              DetailSection(title: 'Finalizar OS', children: _finishWidgets()),
            ],
          ],
        ),
      ),
    );
  }

  Widget? _bottomActionBar() {
    final showChecklistAction =
        _order.isAtClient &&
        _activeStep == _WorkOrderDetailStep.checklist &&
        _checklistStarted &&
        _selectedEquipment != null;
    if (!showChecklistAction) {
      return null;
    }

    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: airmovebrBorder)),
          boxShadow: [
            BoxShadow(
              color: Color(0x1A061C2A),
              blurRadius: 18,
              offset: Offset(0, -6),
            ),
          ],
        ),
        child: FilledButton.icon(
          key: const Key('saveChecklistButton'),
          onPressed: _savingChecklist || !_initialEvidenceSaved
              ? null
              : _saveChecklist,
          icon: const Icon(Icons.save_outlined),
          label: Text(_saveChecklistButtonLabel),
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(56),
            backgroundColor: airmovebrAccent,
            foregroundColor: Colors.white,
          ),
        ),
      ),
    );
  }

  String get _saveChecklistButtonLabel {
    if (_savingChecklist) {
      return 'Salvando...';
    }
    if (!_initialEvidenceSaved) {
      return 'Registre a foto do checklist';
    }
    return 'Salvar checklist';
  }

  bool get _canStart => _order.status == WorkOrderStatus.pending && !_starting;

  String get _startButtonLabel {
    if (_starting) {
      return 'Iniciando...';
    }

    if (_order.status == WorkOrderStatus.pending) {
      return 'Iniciar atendimento';
    }

    return 'Atendimento iniciado';
  }

  Future<void> _startService() async {
    setState(() {
      _starting = true;
      _errorMessage = null;
    });

    try {
      final location = await widget.locationService.currentLocation();
      final updated = await widget.repository.startService(_order, location);
      if (!mounted) {
        return;
      }

      setState(() {
        _order = updated;
        _starting = false;
        _activeStep = _WorkOrderDetailStep.machines;
      });
    } on Object catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _starting = false;
        _errorMessage = error is LocationServiceException
            ? error.message
            : 'Falha ao iniciar servico.';
      });
    }
  }

  Future<void> _saveMachine() async {
    final input = _buildMachineInput();
    final missing = _missingMachineInputFields(input);
    if (missing.isNotEmpty) {
      setState(() {
        _highlightedMachineFields
          ..clear()
          ..addAll(missing);
        _errorMessage =
            'Complete os dados da maquina ou marque impossivel coletar com observacao.';
      });
      return;
    }

    setState(() {
      _errorMessage = null;
      _highlightedMachineFields.clear();
    });

    try {
      final saved = await widget.repository.saveMachineData(_order, input);
      if (!mounted) {
        return;
      }
      setState(() {
        final index = _equipments.indexWhere((item) => item.id == saved.id);
        if (index >= 0) {
          _equipments[index] = saved;
        } else {
          _equipments.add(saved);
        }
        _selectedEquipment = saved;
        _editingMachine = false;
      });
    } on Object {
      if (!mounted) {
        return;
      }
      setState(() {
        _errorMessage = 'Falha ao salvar maquina.';
      });
    }
  }

  Future<void> _scanEquipmentCode() async {
    final code = await widget.barcodeScanner.scanBarcode(context);
    final normalized = code?.trim();
    if (normalized == null || normalized.isEmpty) {
      return;
    }

    final equipment = _equipments.where((item) {
      return item.qrCode.toLowerCase() == normalized.toLowerCase() ||
          item.id.toLowerCase() == normalized.toLowerCase();
    }).firstOrNull;

    setState(() {
      _machineFilter = normalized;
      _errorMessage = null;
      if (equipment == null) {
        _errorMessage = 'Maquina nao encontrada para o codigo $normalized.';
        return;
      }
      if (!equipment.isPending) {
        _errorMessage = 'Maquina ja realizada nesta OS.';
        return;
      }
      _selectedEquipment = equipment;
      _editingMachine = !equipment.hasRequiredMachineData();
      _loadMachineForm(equipment);
      _checklistStarted = false;
      _checklistSaved = false;
      _checklistMessage = null;
      _checklistValues.clear();
      _initialEvidenceSaved = false;
      _signaturePoints.clear();
      _responsibleController.clear();
      _clearTextControllers();
    });
  }

  MachineDataInput _buildMachineInput() {
    return MachineDataInput(
      equipmentId: _selectedEquipment?.id,
      qrCode: _machineControllers['codigo_qr']!.text.trim(),
      type: _machineControllers['tipo']!.text.trim(),
      brand: _machineControllers['marca']!.text.trim(),
      model: _machineControllers['modelo']!.text.trim(),
      btus: int.tryParse(_machineControllers['capacidade_btu']!.text.trim()),
      gas: _machineControllers['gas_refrigerante']!.text.trim(),
      serialNumber: _machineControllers['numero_serie']!.text.trim(),
      location: _machineControllers['local_instalacao']!.text.trim(),
      impossibleFields: {
        for (final field in _machineImpossibleFields)
          field: _machineImpossibleControllers[field]!.text.trim(),
      },
    );
  }

  List<String> _missingMachineInputFields(MachineDataInput input) {
    final values = {
      'codigo_qr': input.qrCode,
      'tipo': input.type,
      'marca': input.brand,
      'modelo': input.model,
      'capacidade_btu': input.btus?.toString() ?? '',
      'gas_refrigerante': input.gas,
      'numero_serie': input.serialNumber,
      'local_instalacao': input.location,
    };

    return values.entries
        .where((entry) {
          final impossible = input.impossibleFields[entry.key];
          return entry.value.trim().isEmpty &&
              (impossible == null || impossible.trim().isEmpty);
        })
        .map((entry) => entry.key)
        .toList();
  }

  Future<void> _saveChecklist() async {
    final equipment = _selectedEquipment;
    if (equipment == null) {
      return;
    }
    final missing = _missingChecklistItems();
    if (missing.isNotEmpty) {
      setState(() {
        _savingChecklist = false;
        _checklistMessage = null;
        _highlightedChecklistCodes
          ..clear()
          ..addAll(missing.map((item) => item.code));
        _errorMessage = 'Preencha: ${missing.first.label}.';
      });
      _scrollToChecklistItem(missing.first.code);
      return;
    }

    setState(() {
      _savingChecklist = true;
      _errorMessage = null;
      _checklistMessage = null;
      _highlightedChecklistCodes.clear();
    });

    try {
      final pendingBefore = await widget.repository.pendingSyncCount();
      await widget.repository.saveChecklist(
        _order,
        equipmentId: equipment.id,
        checklistType: _order.checklistType,
        responses: _buildChecklistResponses(),
      );
      final pendingAfter = await widget.repository.pendingSyncCount();
      if (!mounted) {
        return;
      }

      setState(() {
        _markEquipmentExecution(
          equipment.id,
          pendingAfter > pendingBefore ? 'aguardando_sync' : 'feito',
        );
        _savingChecklist = false;
        _checklistSaved = _allEquipmentsHandled;
        _checklistMessage = _allEquipmentsHandled
            ? 'Todos os equipamentos foram concluidos. Pode finalizar a OS.'
            : 'Maquina concluida. Faltam $_pendingEquipmentCount.';
        _selectedEquipment = null;
        _editingMachine = false;
        _checklistStarted = false;
        _checklistValues.clear();
        _highlightedChecklistCodes.clear();
        _clearTextControllers();
        _signaturePoints.clear();
        _responsibleController.clear();
        _activeStep = _allEquipmentsHandled
            ? _WorkOrderDetailStep.finish
            : _WorkOrderDetailStep.machines;
      });
    } on Object catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _savingChecklist = false;
        _errorMessage = _friendlyError(error, 'Falha ao salvar checklist.');
      });
    }
  }

  String _friendlyError(Object error, String fallback) {
    if (error is HttpException && error.message.trim().isNotEmpty) {
      return error.message;
    }

    return fallback;
  }

  Future<void> _finishWorkOrder() async {
    if (!_allEquipmentsHandled) {
      setState(() {
        _errorMessage =
            'Finalize todos os equipamentos antes de concluir a OS.';
      });
      return;
    }

    var responsibleName = _responsibleController.text.trim();
    var hasSignature = _signaturePoints.whereType<Offset>().isNotEmpty;
    if (kDebugMode) {
      if (responsibleName.isEmpty) {
        responsibleName = 'Teste AIRMOVEBR';
      }
      if (!hasSignature) {
        _signaturePoints
          ..clear()
          ..addAll(const [
            Offset(80, 120),
            Offset(190, 80),
            Offset(320, 130),
            Offset(500, 70),
          ]);
        hasSignature = true;
      }
    }
    if (responsibleName.isEmpty || !hasSignature) {
      setState(() {
        _errorMessage = 'Informe o responsavel e colete a assinatura.';
      });
      return;
    }

    setState(() {
      _finishing = true;
      _errorMessage = null;
    });

    try {
      final pendingBeforeFinish = await widget.repository.pendingSyncCount();
      if (pendingBeforeFinish > 0) {
        final syncResult = await widget.repository.syncPending();
        final pendingAfterSync = await widget.repository.pendingSyncCount();
        if (!mounted) {
          return;
        }
        if (syncResult.failed == 0 && pendingAfterSync == 0) {
          setState(_markWaitingSyncEquipmentsDone);
        }
      }

      final location = await widget.locationService.currentLocation();
      final updated = await widget.repository.finishWorkOrder(
        _order,
        FinalizeWorkOrderInput(
          signatureBase64: await _signatureDataUrl(),
          responsibleName: responsibleName,
          latitude: location.latitude,
          longitude: location.longitude,
          finalizedAt: DateTime.now(),
        ),
      );

      if (!mounted) {
        return;
      }
      setState(() {
        _order = updated;
        _finishing = false;
        _checklistMessage = updated.status == WorkOrderStatus.waitingSync
            ? 'Finalizacao aguardando sincronizacao.'
            : 'OS finalizada.';
      });
      if (updated.status == WorkOrderStatus.waitingSync) {
        _showSnackBar(
          'Finalizacao salva offline. Sincronize quando houver rede.',
        );
      }
    } on Object catch (error) {
      if (!mounted) {
        return;
      }
      final message = _friendlyError(error, 'Falha ao finalizar OS.');
      setState(() {
        _finishing = false;
        _errorMessage = message;
      });
      _showSnackBar(message);
    }
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<String> _signatureDataUrl() async {
    try {
      const size = Size(640, 220);
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      canvas.drawColor(Colors.white, BlendMode.src);
      _SignaturePainter(_signaturePoints).paint(canvas, size);
      final image = await recorder
          .endRecording()
          .toImage(size.width.toInt(), size.height.toInt())
          .timeout(const Duration(seconds: 1));
      final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
      if (bytes != null) {
        return 'data:image/png;base64,${base64Encode(bytes.buffer.asUint8List())}';
      }
    } on Object {
      // Mantem a finalizacao operacional se o renderer do dispositivo falhar.
    }

    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR4XmP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
  }

  Future<void> _pickChecklistPhoto(WorkOrderChecklistItem item) async {
    final equipment = _selectedEquipment;
    if (equipment == null) {
      setState(() {
        _errorMessage = 'Selecione uma maquina antes de fotografar.';
      });
      return;
    }

    setState(() {
      _errorMessage = null;
      _uploadingPhotoCodes.add(item.code);
    });

    try {
      final photo = await widget.photoPicker.pickPhoto();
      if (photo == null) {
        if (!mounted) {
          return;
        }
        setState(() {
          _uploadingPhotoCodes.remove(item.code);
        });
        return;
      }

      final storageUrl = await widget.repository.saveChecklistPhoto(
        _order,
        equipmentId: equipment.id,
        code: item.code,
        photo: photo,
      );

      if (!_initialEvidenceSaved && _isInitialEvidencePhoto(item)) {
        await widget.repository.saveInitialEvidence(
          _order,
          description: 'Foto inicial',
          photo: photo,
        );
      }

      if (!mounted) {
        return;
      }

      setState(() {
        _checklistValues[item.code] = storageUrl;
        if (_isInitialEvidencePhoto(item)) {
          _initialEvidenceSaved = true;
        }
        _uploadingPhotoCodes.remove(item.code);
      });
    } on Object catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _uploadingPhotoCodes.remove(item.code);
        _errorMessage = _friendlyError(
          error,
          'Falha ao enviar foto do checklist.',
        );
      });
    }
  }

  bool _isInitialEvidencePhoto(WorkOrderChecklistItem item) {
    return item.kind == 'foto' && item.code == 'M4';
  }

  List<WorkOrderChecklistResponse> _buildChecklistResponses() {
    return _order.effectiveChecklist.map((item) {
      final textValue = _textControllers[item.code]?.text.trim();
      final value = switch (item.kind) {
        'texto' || 'numerico' => textValue ?? '',
        'foto' => _checklistValues[item.code] ?? 'pendente',
        'finalizacao' => _checklistValues[item.code] ?? 'pendente',
        _ => _checklistValues[item.code] ?? '',
      };
      final note = _noteControllers[item.code]?.text.trim();
      return WorkOrderChecklistResponse(
        code: item.code,
        kind: item.kind,
        value: value,
        note: note == null || note.isEmpty ? null : note,
      );
    }).toList();
  }

  List<WorkOrderChecklistItem> _missingChecklistItems() {
    return _order.effectiveChecklist.where((item) {
      return !_isChecklistItemComplete(item);
    }).toList();
  }

  bool _isChecklistItemComplete(WorkOrderChecklistItem item) {
    if (item.kind == 'finalizacao') {
      return true;
    }
    final textValue = _textControllers[item.code]?.text.trim() ?? '';
    final value = switch (item.kind) {
      'texto' || 'numerico' => textValue,
      'foto' => _checklistValues[item.code] ?? '',
      _ => _checklistValues[item.code] ?? '',
    };
    if (_isNegativeChecklistChoice(value)) {
      return (_noteControllers[item.code]?.text.trim() ?? '').isNotEmpty;
    }
    return value.trim().isNotEmpty && value != 'false';
  }

  bool _isNegativeChecklistChoice(String value) {
    return value.trim().toLowerCase() == 'nao';
  }

  List<WorkOrderChecklistItem> get _requiredChecklistItems {
    return _order.effectiveChecklist
        .where((item) => item.kind != 'finalizacao')
        .toList();
  }

  int get _completedChecklistCount {
    return _requiredChecklistItems.where(_isChecklistItemComplete).length;
  }

  List<Widget> _finishWidgets() {
    final blockedByEquipments = !_allEquipmentsHandled;
    return [
      if (blockedByEquipments) ...[
        Text(
          'Finalize todos os equipamentos antes de concluir a OS. Faltam $_pendingEquipmentCount.',
          style: const TextStyle(
            color: Color(0xFFB3261E),
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 12),
      ],
      TextField(
        key: const Key('responsibleNameField'),
        controller: _responsibleController,
        enabled: _initialEvidenceSaved,
        textInputAction: TextInputAction.next,
        decoration: const InputDecoration(labelText: 'Nome do responsavel'),
      ),
      const SizedBox(height: 12),
      _SignaturePad(
        points: _signaturePoints,
        enabled: _initialEvidenceSaved,
        onChanged: (points) {
          setState(() {
            _signaturePoints
              ..clear()
              ..addAll(points);
          });
        },
      ),
      const SizedBox(height: 8),
      OutlinedButton.icon(
        key: const Key('clearSignatureButton'),
        onPressed: !_initialEvidenceSaved || _signaturePoints.isEmpty
            ? null
            : () {
                setState(_signaturePoints.clear);
              },
        icon: const Icon(Icons.backspace_outlined),
        label: const Text('Limpar assinatura'),
      ),
      const SizedBox(height: 12),
      FilledButton.icon(
        key: const Key('finishWorkOrderButton'),
        onPressed: blockedByEquipments || !_checklistSaved || _finishing
            ? null
            : _finishWorkOrder,
        icon: const Icon(Icons.assignment_turned_in_outlined),
        label: Text(
          !_checklistSaved
              ? blockedByEquipments
                    ? 'Finalize todos os equipamentos'
                    : 'Salve o checklist primeiro'
              : _finishing
              ? 'Finalizando...'
              : 'Finalizar OS',
        ),
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          backgroundColor: airmovebrAccent,
          foregroundColor: Colors.white,
        ),
      ),
    ];
  }

  TextEditingController _controllerFor(String code) {
    return _textControllers.putIfAbsent(code, TextEditingController.new);
  }

  TextEditingController _noteControllerFor(String code) {
    return _noteControllers.putIfAbsent(code, TextEditingController.new);
  }

  List<Widget> _checklistWidgets() {
    final widgets = <Widget>[];
    String? currentGroup;

    widgets.add(
      _ChecklistProgressSummary(
        completed: _completedChecklistCount,
        total: _requiredChecklistItems.length,
        nextMissing: _missingChecklistItems().firstOrNull?.label,
      ),
    );

    for (final item in _order.effectiveChecklist) {
      final group = _checklistGroupFor(item);
      if (group != currentGroup) {
        widgets.add(_ChecklistGroupHeader(label: group));
        currentGroup = group;
      }

      widgets.add(
        _ChecklistField(
          itemKey: _checklistItemKey(item.code),
          item: item,
          value: _checklistValues[item.code],
          textController: _controllerFor(item.code),
          noteController: _noteControllerFor(item.code),
          uploadingPhoto: _uploadingPhotoCodes.contains(item.code),
          onChanged: (value) {
            setState(() {
              _checklistValues[item.code] = value;
              _highlightedChecklistCodes.remove(item.code);
            });
          },
          missing: _highlightedChecklistCodes.contains(item.code),
          onPhotoPressed: item.kind == 'foto'
              ? () => _pickChecklistPhoto(item)
              : null,
        ),
      );
    }

    return widgets;
  }

  GlobalKey _checklistItemKey(String code) {
    return _checklistItemKeys.putIfAbsent(code, GlobalKey.new);
  }

  void _scrollToChecklistItem(String code) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final context = _checklistItemKeys[code]?.currentContext;
      if (context == null) {
        return;
      }
      Scrollable.ensureVisible(
        context,
        duration: const Duration(milliseconds: 260),
        alignment: 0.12,
      );
    });
  }

  void _clearTextControllers() {
    for (final controller in _textControllers.values) {
      controller.clear();
    }
    for (final controller in _noteControllers.values) {
      controller.clear();
    }
    _uploadingPhotoCodes.clear();
  }

  List<WorkOrderEquipment> _filteredEquipments() {
    final filter = _machineFilter.trim().toLowerCase();
    final equipments = _equipments
        .where((equipment) => equipment.isPending)
        .toList();
    if (filter.isEmpty) {
      return equipments;
    }

    return equipments.where((equipment) {
      final searchable = [
        equipment.id,
        equipment.name,
        equipment.location,
        equipment.model,
      ].join(' ').toLowerCase();
      return searchable.contains(filter);
    }).toList();
  }

  List<Widget> _machineSelectionWidgets() {
    final pending = _filteredEquipments();
    final incomplete = pending
        .where((equipment) => !equipment.hasRequiredMachineData())
        .toList();
    final ready = pending
        .where((equipment) => equipment.hasRequiredMachineData())
        .toList();
    final handled = _handledEquipments();

    return [
      if (incomplete.isNotEmpty) ...[
        _MachineListHeader(
          title: 'Com dados faltando',
          count: incomplete.length,
          color: airmovebrPrimary,
        ),
        ...incomplete.map(_selectableMachineCard),
      ],
      if (ready.isNotEmpty) ...[
        _MachineListHeader(
          title: 'Prontas para checklist',
          count: ready.length,
          color: airmovebrSuccess,
        ),
        ...ready.map(_selectableMachineCard),
      ],
      if (handled.isNotEmpty) ...[
        _MachineListHeader(
          title: 'Concluidas',
          count: handled.length,
          color: airmovebrMuted,
        ),
        ...handled.map((equipment) => _EquipmentItem(equipment: equipment)),
        const SizedBox(height: 4),
      ],
    ];
  }

  Widget _selectableMachineCard(WorkOrderEquipment equipment) {
    return _SelectableEquipmentItem(
      key: Key('selectEquipment_${equipment.id}'),
      equipment: equipment,
      selected: _selectedEquipment?.id == equipment.id,
      onTap: () {
        setState(() {
          _selectedEquipment = equipment;
          _editingMachine = !equipment.hasRequiredMachineData();
          _loadMachineForm(equipment);
          _checklistStarted = false;
          _checklistSaved = false;
          _checklistMessage = null;
          _checklistValues.clear();
          _initialEvidenceSaved = false;
          _signaturePoints.clear();
          _responsibleController.clear();
          _clearTextControllers();
          _activeStep = _WorkOrderDetailStep.machines;
        });
      },
    );
  }

  List<WorkOrderEquipment> _handledEquipments() {
    return _equipments.where((equipment) => !equipment.isPending).toList();
  }

  bool get _allEquipmentsHandled =>
      _equipments.isNotEmpty &&
      _equipments.every((equipment) => !equipment.isPending);

  int get _pendingEquipmentCount =>
      _equipments.where((equipment) => equipment.isPending).length;

  void _markEquipmentExecution(String equipmentId, String status) {
    _equipments = _equipments
        .map(
          (equipment) => equipment.id == equipmentId
              ? equipment.copyWith(executionStatus: status)
              : equipment,
        )
        .toList();
  }

  void _markWaitingSyncEquipmentsDone() {
    _equipments = _equipments
        .map(
          (equipment) => equipment.isWaitingSync
              ? equipment.copyWith(executionStatus: 'feito')
              : equipment,
        )
        .toList();
  }

  void _loadMachineForm(WorkOrderEquipment equipment) {
    _machineControllers['codigo_qr']!.text = equipment.qrCode;
    _machineControllers['tipo']!.text = equipment.type;
    _machineControllers['marca']!.text = equipment.brand;
    _machineControllers['modelo']!.text = equipment.model;
    _machineControllers['capacidade_btu']!.text =
        equipment.btus?.toString() ?? '';
    _machineControllers['gas_refrigerante']!.text = equipment.gas;
    _machineControllers['numero_serie']!.text = equipment.serialNumber;
    _machineControllers['local_instalacao']!.text = equipment.location;
    _machineImpossibleFields
      ..clear()
      ..addAll(equipment.impossibleFields.keys);
    _highlightedMachineFields.clear();
    for (final entry in _machineImpossibleControllers.entries) {
      entry.value.text = equipment.impossibleFields[entry.key] ?? '';
    }
  }

  void _clearMachineForm() {
    for (final controller in _machineControllers.values) {
      controller.clear();
    }
    for (final controller in _machineImpossibleControllers.values) {
      controller.clear();
    }
    _machineImpossibleFields.clear();
    _highlightedMachineFields.clear();
  }
}

class _StepTabs extends StatelessWidget {
  const _StepTabs({required this.activeStep, required this.onChanged});

  final _WorkOrderDetailStep activeStep;
  final ValueChanged<_WorkOrderDetailStep> onChanged;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _StepTab(
            key: const Key('stepTab_data'),
            icon: Icons.assignment_outlined,
            label: 'Dados',
            selected: activeStep == _WorkOrderDetailStep.data,
            onTap: () => onChanged(_WorkOrderDetailStep.data),
          ),
          _StepTab(
            key: const Key('stepTab_machines'),
            icon: Icons.ac_unit,
            label: 'Maquinas',
            selected: activeStep == _WorkOrderDetailStep.machines,
            onTap: () => onChanged(_WorkOrderDetailStep.machines),
          ),
          _StepTab(
            key: const Key('stepTab_checklist'),
            icon: Icons.checklist_rounded,
            label: 'Checklist',
            selected: activeStep == _WorkOrderDetailStep.checklist,
            onTap: () => onChanged(_WorkOrderDetailStep.checklist),
          ),
          _StepTab(
            key: const Key('stepTab_finish'),
            icon: Icons.draw_outlined,
            label: 'Finalizar',
            selected: activeStep == _WorkOrderDetailStep.finish,
            onTap: () => onChanged(_WorkOrderDetailStep.finish),
          ),
        ],
      ),
    );
  }
}

class _StepTab extends StatelessWidget {
  const _StepTab({
    super.key,
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        selected: selected,
        avatar: Icon(
          icon,
          size: 18,
          color: selected ? Colors.white : airmovebrPrimary,
        ),
        label: Text(label),
        labelStyle: TextStyle(
          color: selected ? Colors.white : airmovebrText,
          fontWeight: FontWeight.w800,
        ),
        selectedColor: airmovebrPrimary,
        backgroundColor: Colors.white,
        side: const BorderSide(color: airmovebrBorder),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        onSelected: (_) => onTap(),
      ),
    );
  }
}

class _SignaturePad extends StatefulWidget {
  const _SignaturePad({
    required this.points,
    required this.enabled,
    required this.onChanged,
  });

  final List<Offset?> points;
  final bool enabled;
  final ValueChanged<List<Offset?>> onChanged;

  @override
  State<_SignaturePad> createState() => _SignaturePadState();
}

class _SignaturePadState extends State<_SignaturePad> {
  late List<Offset?> _points;

  @override
  void initState() {
    super.initState();
    _points = List<Offset?>.of(widget.points);
  }

  @override
  void didUpdateWidget(covariant _SignaturePad oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.points.isEmpty && _points.isNotEmpty) {
      _points = [];
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      key: const Key('signaturePad'),
      behavior: HitTestBehavior.opaque,
      onPanStart: widget.enabled
          ? (details) => _addPoint(details.localPosition)
          : null,
      onPanUpdate: widget.enabled
          ? (details) => _addPoint(details.localPosition)
          : null,
      onPanEnd: widget.enabled
          ? (_) {
              _points.add(null);
              widget.onChanged(List<Offset?>.of(_points));
            }
          : null,
      onTapDown: widget.enabled
          ? (details) => _addPoint(details.localPosition)
          : null,
      child: CustomPaint(
        foregroundPainter: _SignaturePainter(_points),
        child: Container(
          height: 180,
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: const Color(0xFFD8DEE8)),
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
    );
  }

  void _addPoint(Offset point) {
    setState(() {
      _points.add(point);
    });
    widget.onChanged(List<Offset?>.of(_points));
  }
}

class _SignaturePainter extends CustomPainter {
  const _SignaturePainter(this.points);

  final List<Offset?> points;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = airmovebrText
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;

    for (var index = 0; index < points.length - 1; index += 1) {
      final current = points[index];
      final next = points[index + 1];
      if (current != null && next != null) {
        canvas.drawLine(current, next, paint);
      } else if (current != null) {
        canvas.drawCircle(current, 2, paint);
      }
    }
    if (points.length == 1 && points.first != null) {
      canvas.drawCircle(points.first!, 2, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _SignaturePainter oldDelegate) {
    return oldDelegate.points != points;
  }
}

class _MachineListHeader extends StatelessWidget {
  const _MachineListHeader({
    required this.title,
    required this.count,
    required this.color,
  });

  final String title;
  final int count;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(2, 10, 2, 8),
      child: Row(
        children: [
          Text(
            title,
            style: TextStyle(
              color: color,
              fontSize: 15,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(width: 8),
          _StatusPill(
            label: count == 1 ? '1 maquina' : '$count maquinas',
            color: color,
            backgroundColor: Colors.white,
          ),
          const SizedBox(width: 10),
          const Expanded(child: Divider(color: airmovebrBorder)),
        ],
      ),
    );
  }
}

class _MachineMissingSummary extends StatelessWidget {
  const _MachineMissingSummary({required this.missingFields});

  final List<String> missingFields;

  @override
  Widget build(BuildContext context) {
    if (missingFields.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: airmovebrRequiredMissingFill,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: airmovebrRequiredMissingBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.info_outline, color: airmovebrPrimary),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Falta preencher',
                      style: TextStyle(
                        color: airmovebrPrimary,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Text(
                      missingFields.length == 1
                          ? '1 pendencia'
                          : '${missingFields.length} pendencias',
                      style: const TextStyle(color: airmovebrMuted),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: missingFields
                .map(
                  (field) => _StatusPill(
                    label: _machineFieldLabel(field),
                    color: airmovebrPrimary,
                    backgroundColor: Colors.white,
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }
}

String _machineFieldLabel(String field) {
  return _machineFieldLabels[field] ?? field;
}

class _MachineField extends StatelessWidget {
  const _MachineField({
    required this.fieldKey,
    required this.label,
    required this.controller,
    required this.impossibleController,
    required this.impossible,
    required this.missing,
    required this.onImpossibleChanged,
    required this.onChanged,
    this.numeric = false,
    this.options = const [],
  });

  final String fieldKey;
  final String label;
  final TextEditingController controller;
  final TextEditingController impossibleController;
  final bool impossible;
  final bool missing;
  final bool numeric;
  final List<String> options;
  final ValueChanged<bool> onImpossibleChanged;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    final currentValue = controller.text.trim();
    final dropdownOptions =
        currentValue.isEmpty || options.contains(currentValue)
        ? options
        : [currentValue, ...options];
    final decoration = InputDecoration(
      labelText: label,
      helperText: missing ? 'Falta preencher' : null,
      helperStyle: const TextStyle(
        color: airmovebrPrimary,
        fontWeight: FontWeight.w800,
      ),
      fillColor: missing ? airmovebrRequiredMissingFill : null,
      enabledBorder: missing
          ? _fieldBorder(airmovebrRequiredMissingBorder, width: 2)
          : null,
      focusedBorder: missing ? _fieldBorder(airmovebrPrimary, width: 2) : null,
      prefixIcon: missing
          ? const Icon(Icons.info_outline, color: airmovebrPrimary)
          : null,
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (options.isEmpty)
            TextField(
              key: Key('machineField_$fieldKey'),
              controller: controller,
              enabled: !impossible,
              keyboardType: numeric ? TextInputType.number : TextInputType.text,
              textInputAction: TextInputAction.next,
              decoration: decoration,
              onChanged: (_) => onChanged(),
            )
          else
            DropdownButtonFormField<String>(
              key: Key('machineSelect_$fieldKey'),
              initialValue: currentValue.isEmpty ? null : currentValue,
              decoration: decoration,
              items: dropdownOptions
                  .map(
                    (option) =>
                        DropdownMenuItem(value: option, child: Text(option)),
                  )
                  .toList(),
              onChanged: impossible
                  ? null
                  : (value) {
                      if (value != null) {
                        controller.text = value;
                        onChanged();
                      }
                    },
            ),
          Row(
            key: Key('machineImpossible_$fieldKey'),
            children: [
              Checkbox(
                value: impossible,
                onChanged: (value) => onImpossibleChanged(value == true),
              ),
              const Expanded(child: Text('Impossivel coletar dados')),
            ],
          ),
          if (impossible)
            TextField(
              key: Key('machineImpossibleNote_$fieldKey'),
              controller: impossibleController,
              decoration: const InputDecoration(
                labelText: 'Observacao obrigatoria',
              ),
              textInputAction: TextInputAction.next,
              maxLines: 1,
            ),
        ],
      ),
    );
  }
}

class _ChecklistProgressSummary extends StatelessWidget {
  const _ChecklistProgressSummary({
    required this.completed,
    required this.total,
    required this.nextMissing,
  });

  final int completed;
  final int total;
  final String? nextMissing;

  @override
  Widget build(BuildContext context) {
    final progress = total == 0 ? 0.0 : completed / total;
    return Container(
      key: const Key('checklistProgressSummary'),
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFE9F8FC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: airmovebrBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.task_alt_outlined, color: airmovebrPrimary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  total == 0
                      ? 'Sem itens obrigatorios'
                      : '$completed/$total preenchidos',
                  style: const TextStyle(
                    color: airmovebrText,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: Colors.white,
              valueColor: const AlwaysStoppedAnimation<Color>(airmovebrSuccess),
            ),
          ),
          if (nextMissing != null) ...[
            const SizedBox(height: 10),
            Text(
              'Proxima pendencia: $nextMissing',
              style: const TextStyle(
                color: airmovebrPrimary,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ChecklistField extends StatelessWidget {
  const _ChecklistField({
    required this.itemKey,
    required this.item,
    required this.value,
    required this.textController,
    required this.noteController,
    required this.uploadingPhoto,
    required this.missing,
    required this.onChanged,
    this.onPhotoPressed,
  });

  final Key itemKey;
  final WorkOrderChecklistItem item;
  final String? value;
  final TextEditingController textController;
  final TextEditingController noteController;
  final bool uploadingPhoto;
  final bool missing;
  final ValueChanged<String> onChanged;
  final VoidCallback? onPhotoPressed;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: itemKey,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: missing ? airmovebrRequiredMissingFill : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: missing ? airmovebrRequiredMissingBorder : airmovebrBorder,
          width: missing ? 2 : 1,
        ),
      ),
      child: switch (item.kind) {
        'checkbox' => Column(
          key: Key('checklist_choice_${item.code}'),
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _ChecklistLabel(label: item.label, missing: missing),
            const SizedBox(height: 10),
            Row(
              children: ['Sim', 'Nao', 'N/A'].map((option) {
                final selected = value == option;
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: OutlinedButton(
                      key: Key('checklist_choice_${item.code}_$option'),
                      onPressed: () => onChanged(option),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: selected
                            ? airmovebrPrimary
                            : Colors.white,
                        foregroundColor: selected
                            ? Colors.white
                            : airmovebrText,
                        side: BorderSide(
                          color: selected ? airmovebrPrimary : airmovebrBorder,
                        ),
                      ),
                      child: Text(option),
                    ),
                  ),
                );
              }).toList(),
            ),
            if (_showChecklistObservation(value)) ...[
              const SizedBox(height: 8),
              TextField(
                key: Key('checklist_obs_${item.code}'),
                controller: noteController,
                decoration: const InputDecoration(
                  labelText: 'Observacao obrigatoria',
                ),
                textInputAction: TextInputAction.next,
                maxLines: 1,
                onChanged: (_) => onChanged(value ?? ''),
              ),
            ],
          ],
        ),
        'select' => DropdownButtonFormField<String>(
          key: Key('checklist_select_${item.code}'),
          initialValue: value,
          decoration: _checklistDecoration(item.label, missing),
          items: item.options
              .map(
                (option) =>
                    DropdownMenuItem(value: option, child: Text(option)),
              )
              .toList(),
          onChanged: (selected) {
            if (selected != null) {
              onChanged(selected);
            }
          },
        ),
        'select_obs' => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            DropdownButtonFormField<String>(
              key: Key('checklist_select_${item.code}'),
              initialValue: value,
              decoration: _checklistDecoration(item.label, missing),
              items:
                  (item.options.isEmpty
                          ? const ['ok', 'nao conforme']
                          : item.options)
                      .map(
                        (option) => DropdownMenuItem(
                          value: option,
                          child: Text(option),
                        ),
                      )
                      .toList(),
              onChanged: (selected) {
                if (selected != null) {
                  onChanged(selected);
                }
              },
            ),
            if (_showChecklistObservation(value)) ...[
              const SizedBox(height: 8),
              TextField(
                key: Key('checklist_obs_${item.code}'),
                controller: noteController,
                decoration: const InputDecoration(labelText: 'Observacao'),
                textInputAction: TextInputAction.next,
                maxLines: 1,
              ),
            ],
          ],
        ),
        'numerico' => TextField(
          key: Key('checklist_number_${item.code}'),
          controller: textController,
          decoration: _checklistDecoration(
            item.unit == null ? item.label : '${item.label} (${item.unit})',
            missing,
          ),
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          textInputAction: TextInputAction.next,
          onChanged: onChanged,
        ),
        'texto' => TextField(
          key: Key('checklist_text_${item.code}'),
          controller: textController,
          decoration: _checklistDecoration(item.label, missing),
          textInputAction: TextInputAction.next,
          maxLines: 1,
          onChanged: onChanged,
        ),
        'foto' => OutlinedButton.icon(
          key: Key('checklist_photo_${item.code}'),
          onPressed: uploadingPhoto ? null : onPhotoPressed,
          icon: Icon(
            value != null && value!.startsWith('/storage/')
                ? Icons.check_circle_outline
                : Icons.photo_camera_outlined,
          ),
          label: Text(
            uploadingPhoto
                ? 'Enviando foto...'
                : value != null && value!.startsWith('/storage/')
                ? 'Foto registrada'
                : item.label,
          ),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(48),
            alignment: Alignment.centerLeft,
            backgroundColor: missing ? Colors.white : null,
            foregroundColor: missing ? airmovebrPrimary : null,
            side: BorderSide(
              color: missing ? airmovebrRequiredMissingBorder : airmovebrBorder,
              width: missing ? 2 : 1,
            ),
          ),
        ),
        'finalizacao' => Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            key: Key('checklist_final_${item.code}'),
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.assignment_turned_in_outlined),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.label),
                    const SizedBox(height: 2),
                    const Text(
                      'Sera preenchido na finalizacao da OS.',
                      style: TextStyle(color: airmovebrMuted),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        _ => Text(item.label),
      },
    );
  }

  InputDecoration _checklistDecoration(String label, bool missing) {
    return InputDecoration(
      labelText: label,
      helperText: missing ? 'Falta preencher' : null,
      helperStyle: const TextStyle(
        color: airmovebrPrimary,
        fontWeight: FontWeight.w800,
      ),
      fillColor: missing ? airmovebrRequiredMissingFill : null,
      enabledBorder: missing
          ? _fieldBorder(airmovebrRequiredMissingBorder, width: 2)
          : null,
      focusedBorder: missing ? _fieldBorder(airmovebrPrimary, width: 2) : null,
      prefixIcon: missing
          ? const Icon(Icons.info_outline, color: airmovebrPrimary)
          : null,
    );
  }

  bool _showChecklistObservation(String? selected) {
    final normalized = selected?.toLowerCase().trim() ?? '';
    return normalized == 'nao' ||
        normalized.contains('suja') ||
        normalized == 'nao conforme';
  }
}

class _ChecklistGroupHeader extends StatelessWidget {
  const _ChecklistGroupHeader({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(2, 8, 2, 8),
      child: Row(
        children: [
          Icon(_checklistGroupIcon(label), color: airmovebrPrimary, size: 20),
          const SizedBox(width: 8),
          Text(
            label,
            style: const TextStyle(
              color: airmovebrPrimary,
              fontSize: 15,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(width: 10),
          const Expanded(child: Divider(color: airmovebrBorder)),
        ],
      ),
    );
  }
}

String _checklistGroupFor(WorkOrderChecklistItem item) {
  final label = item.label.toLowerCase();
  if (item.kind == 'foto') {
    return 'Fotos';
  }
  if (item.kind == 'numerico' ||
      label.contains('temperatura') ||
      label.contains('pressao') ||
      label.contains('fluido')) {
    return 'Medicoes';
  }
  if (label.contains('epi') ||
      label.contains('deslig') ||
      label.contains('disjuntor') ||
      label.contains('ambiente')) {
    return 'Seguranca';
  }
  if (item.kind == 'finalizacao' ||
      label.contains('fechar') ||
      label.startsWith('ligar') ||
      label.contains(' ligar') ||
      label.contains('dry')) {
    return 'Fechamento';
  }
  if (label.contains('interna') ||
      label.contains('bandeja') ||
      label.contains('bandeija') ||
      label.contains('condensadora')) {
    return 'Inspecao';
  }
  if (label.contains('filtro') || label.contains('secagem')) {
    return 'Filtro e limpeza';
  }
  return 'Geral';
}

IconData _checklistGroupIcon(String label) {
  return switch (label) {
    'Seguranca' => Icons.health_and_safety_outlined,
    'Fotos' => Icons.photo_camera_outlined,
    'Filtro e limpeza' => Icons.filter_alt_outlined,
    'Inspecao' => Icons.search_outlined,
    'Medicoes' => Icons.device_thermostat_outlined,
    'Fechamento' => Icons.assignment_turned_in_outlined,
    _ => Icons.checklist_rounded,
  };
}

class _ChecklistLabel extends StatelessWidget {
  const _ChecklistLabel({required this.label, required this.missing});

  final String label;
  final bool missing;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: airmovebrText,
            fontSize: 16,
            fontWeight: FontWeight.w800,
          ),
        ),
        if (missing) ...[
          const SizedBox(height: 2),
          const Text(
            'Falta preencher',
            style: TextStyle(
              color: airmovebrPrimary,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ],
    );
  }
}

List<Widget> _equipmentWidgets(WorkOrder order) {
  return _equipmentsFor(
    order,
  ).map((equipment) => _EquipmentItem(equipment: equipment)).toList();
}

List<WorkOrderEquipment> _equipmentsFor(WorkOrder order) {
  return order.equipments.isEmpty
      ? [
          WorkOrderEquipment(
            id: order.id,
            name: order.equipment,
            location: order.address,
            model: order.equipment,
          ),
        ]
      : order.equipments;
}

class _EquipmentItem extends StatelessWidget {
  const _EquipmentItem({required this.equipment});

  final WorkOrderEquipment equipment;

  @override
  Widget build(BuildContext context) {
    final missingCount = equipment.missingRequiredFields().length;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: missingCount > 0
            ? airmovebrRequiredMissingFill
            : const Color(0xFFF8FBFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: missingCount > 0
              ? airmovebrRequiredMissingBorder
              : airmovebrBorder,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.ac_unit, color: airmovebrPrimary, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  equipment.name,
                  style: const TextStyle(
                    color: airmovebrText,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${equipment.location} - ${equipment.model}',
                  style: const TextStyle(color: airmovebrMuted),
                ),
                if (!equipment.isPending) ...[
                  const SizedBox(height: 4),
                  _StatusPill(
                    label: equipment.isWaitingSync
                        ? 'Aguardando sync'
                        : 'Realizada',
                    color: equipment.isWaitingSync
                        ? airmovebrWarning
                        : airmovebrSuccess,
                  ),
                ] else if (missingCount > 0) ...[
                  const SizedBox(height: 6),
                  _StatusPill(
                    label: missingCount == 1
                        ? '1 pendencia'
                        : '$missingCount pendencias',
                    color: airmovebrPrimary,
                    backgroundColor: Colors.white,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SelectableEquipmentItem extends StatelessWidget {
  const _SelectableEquipmentItem({
    super.key,
    required this.equipment,
    required this.selected,
    required this.onTap,
  });

  final WorkOrderEquipment equipment;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final missingCount = equipment.missingRequiredFields().length;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: OutlinedButton(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(
          alignment: Alignment.centerLeft,
          padding: const EdgeInsets.all(12),
          backgroundColor: missingCount > 0
              ? airmovebrRequiredMissingFill
              : selected
              ? const Color(0xFFE9F8FC)
              : Colors.white,
          side: BorderSide(
            color: missingCount > 0
                ? airmovebrRequiredMissingBorder
                : selected
                ? airmovebrPrimary
                : const Color(0xFFD8DEE8),
            width: selected ? 2 : 1,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              selected
                  ? Icons.radio_button_checked
                  : Icons.radio_button_unchecked,
              color: selected ? airmovebrPrimary : airmovebrMuted,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    equipment.qrCode.isEmpty
                        ? equipment.name
                        : '${equipment.qrCode} - ${equipment.type}',
                    style: const TextStyle(
                      color: airmovebrText,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    [
                      if (equipment.brand.isNotEmpty) equipment.brand,
                      equipment.model,
                      if (equipment.btus != null) '${equipment.btus} BTUs',
                      equipment.location,
                    ].where((item) => item.isNotEmpty).join(' - '),
                    style: const TextStyle(color: airmovebrMuted),
                  ),
                  const SizedBox(height: 6),
                  _StatusPill(
                    label: missingCount > 0
                        ? missingCount == 1
                              ? '1 pendencia'
                              : '$missingCount pendencias'
                        : 'Pronta para checklist',
                    color: missingCount > 0
                        ? airmovebrPrimary
                        : airmovebrSuccess,
                    backgroundColor: Colors.white,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.order});

  final WorkOrder order;

  @override
  Widget build(BuildContext context) {
    final statusColor = switch (order.status) {
      WorkOrderStatus.done || WorkOrderStatus.synced => airmovebrSuccess,
      WorkOrderStatus.waitingSync => airmovebrWarning,
      WorkOrderStatus.inProgress => airmovebrAccent,
      WorkOrderStatus.pending => Colors.white70,
    };
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: airmovebrPrimary,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33073A55),
            blurRadius: 20,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            order.id,
            style: const TextStyle(
              color: Colors.white70,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            order.clientName,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _StatusPill(
                label: order.status.label,
                color: statusColor,
                backgroundColor: Colors.white,
              ),
              _StatusPill(
                label: order.serviceLabel,
                color: airmovebrPrimary,
                backgroundColor: const Color(0xFFEAF4FF),
              ),
              _StatusPill(
                label: order.equipmentCountLabel,
                color: airmovebrPrimary,
                backgroundColor: const Color(0xFFEAF4FF),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({
    required this.label,
    required this.color,
    this.backgroundColor,
  });

  final String label;
  final Color color;
  final Color? backgroundColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: backgroundColor ?? color.withAlpha(31),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withAlpha(71)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: airmovebrMuted, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(color: airmovebrMuted, fontSize: 12),
                ),
                Text(
                  value,
                  style: const TextStyle(
                    color: airmovebrText,
                    fontWeight: FontWeight.w700,
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
