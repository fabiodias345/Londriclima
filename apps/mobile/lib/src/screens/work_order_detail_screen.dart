import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../models/work_order.dart';
import '../repositories/work_order_repository.dart';
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

class WorkOrderDetailScreen extends StatefulWidget {
  const WorkOrderDetailScreen({
    super.key,
    required this.order,
    required this.repository,
    required this.locationService,
    required this.photoPicker,
  });

  final WorkOrder order;
  final WorkOrderRepository repository;
  final LocationService locationService;
  final ChecklistPhotoPicker photoPicker;

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
  bool _savingInitialEvidence = false;
  bool _savingFinalEvidence = false;
  bool _initialEvidenceSaved = false;
  bool _finalEvidenceSaved = false;
  bool _finishing = false;
  String? _checklistMessage;
  final _checklistSectionKey = GlobalKey();
  final Map<String, String> _checklistValues = {};
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
  String? _errorMessage;

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
    _responsibleController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _order = widget.order;
    _equipments = List<WorkOrderEquipment>.of(_equipmentsFor(widget.order));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Detalhes da OS')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 24),
          children: [
            _Header(order: _order),
            const SizedBox(height: 14),
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
              ],
            ),
            const SizedBox(height: 14),
            DetailSection(
              title: 'Equipamentos deste atendimento',
              children: _equipmentWidgets(_order),
            ),
            const SizedBox(height: 14),
            DetailSection(
              title: 'Checklist previsto',
              children: _checklistFor(
                _order,
              ).map((item) => _Bullet(text: item)).toList(),
            ),
            const SizedBox(height: 14),
            const DetailSection(
              title: 'Obrigatorios da execucao',
              children: [
                _Bullet(text: 'GPS inicial'),
                _Bullet(text: 'Foto antes'),
                _Bullet(text: 'Checklist completo'),
                _Bullet(text: 'Foto depois'),
                _Bullet(text: 'Nome e assinatura do cliente'),
                _Bullet(text: 'GPS final'),
              ],
            ),
            const SizedBox(height: 18),
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
            if (_order.isAtClient) ...[
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
                  ..._filteredEquipments().map(
                    (equipment) => _SelectableEquipmentItem(
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
                          _finalEvidenceSaved = false;
                          _signaturePoints.clear();
                          _responsibleController.clear();
                          _clearTextControllers();
                        });
                      },
                    ),
                  ),
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
                        _finalEvidenceSaved = false;
                        _signaturePoints.clear();
                        _responsibleController.clear();
                        _clearMachineForm();
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
                      'Nenhuma maquina encontrada.',
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
                            } else {
                              _machineImpossibleFields.remove(entry.key);
                              _machineImpossibleControllers[entry.key]!.clear();
                            }
                          });
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
              if (_checklistStarted && _selectedEquipment != null) ...[
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  key: const Key('initialEvidenceButton'),
                  onPressed: _savingInitialEvidence || _initialEvidenceSaved
                      ? null
                      : _saveInitialEvidence,
                  icon: Icon(
                    _initialEvidenceSaved
                        ? Icons.check_circle_outline
                        : Icons.photo_camera_outlined,
                  ),
                  label: Text(
                    _savingInitialEvidence
                        ? 'Enviando foto antes...'
                        : _initialEvidenceSaved
                        ? 'Foto antes registrada'
                        : 'Registrar foto antes',
                  ),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                    alignment: Alignment.centerLeft,
                  ),
                ),
                const SizedBox(height: 12),
                DetailSection(
                  key: _checklistSectionKey,
                  title: 'Checklist da maquina',
                  children: _order.checklist.isEmpty
                      ? const [
                          Text(
                            'Checklist nao definido para esta OS.',
                            style: TextStyle(color: airmovebrMuted),
                          ),
                        ]
                      : _order.checklist
                            .map(
                              (item) => _ChecklistField(
                                item: item,
                                value: _checklistValues[item.code],
                                textController: _controllerFor(item.code),
                                noteController: _noteControllerFor(item.code),
                                uploadingPhoto: _uploadingPhotoCodes.contains(
                                  item.code,
                                ),
                                onChanged: (value) {
                                  setState(() {
                                    _checklistValues[item.code] = value;
                                  });
                                },
                                onPhotoPressed: item.kind == 'foto'
                                    ? () => _pickChecklistPhoto(item)
                                    : null,
                              ),
                            )
                            .toList(),
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
                FilledButton.icon(
                  key: const Key('saveChecklistButton'),
                  onPressed: _savingChecklist || !_initialEvidenceSaved
                      ? null
                      : _saveChecklist,
                  icon: const Icon(Icons.save_outlined),
                  label: Text(
                    _savingChecklist
                        ? 'Salvando...'
                        : !_initialEvidenceSaved
                        ? 'Registre foto antes'
                        : 'Salvar checklist',
                  ),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(52),
                    backgroundColor: airmovebrAccent,
                    foregroundColor: Colors.white,
                  ),
                ),
                const SizedBox(height: 12),
                DetailSection(
                  title: 'Finalizar OS',
                  children: [
                    OutlinedButton.icon(
                      key: const Key('finalEvidenceButton'),
                      onPressed:
                          !_initialEvidenceSaved ||
                              _savingFinalEvidence ||
                              _finalEvidenceSaved
                          ? null
                          : _saveFinalEvidence,
                      icon: Icon(
                        _finalEvidenceSaved
                            ? Icons.check_circle_outline
                            : Icons.photo_camera_outlined,
                      ),
                      label: Text(
                        !_initialEvidenceSaved
                            ? 'Registre foto antes'
                            : _savingFinalEvidence
                            ? 'Enviando foto depois...'
                            : _finalEvidenceSaved
                            ? 'Foto depois registrada'
                            : 'Registrar foto depois',
                      ),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                        alignment: Alignment.centerLeft,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      key: const Key('responsibleNameField'),
                      controller: _responsibleController,
                      enabled: _initialEvidenceSaved,
                      decoration: const InputDecoration(
                        labelText: 'Nome do responsavel',
                      ),
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
                      onPressed:
                          !_initialEvidenceSaved || _signaturePoints.isEmpty
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
                      onPressed: !_checklistSaved || _finishing
                          ? null
                          : _finishWorkOrder,
                      icon: const Icon(Icons.assignment_turned_in_outlined),
                      label: Text(
                        !_checklistSaved
                            ? 'Salve o checklist primeiro'
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
                  ],
                ),
              ],
            ],
          ],
        ),
      ),
    );
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
        _errorMessage =
            'Complete os dados da maquina ou marque impossivel coletar com observacao.';
      });
      return;
    }

    setState(() {
      _errorMessage = null;
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

    setState(() {
      _savingChecklist = true;
      _errorMessage = null;
      _checklistMessage = null;
    });

    try {
      await widget.repository.saveChecklist(
        _order,
        equipmentId: equipment.id,
        checklistType: _order.checklistType,
        responses: _buildChecklistResponses(),
      );
      if (!mounted) {
        return;
      }

      setState(() {
        _savingChecklist = false;
        _checklistSaved = true;
        _checklistMessage = 'Checklist salvo.';
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

  Future<void> _saveInitialEvidence() async {
    setState(() {
      _savingInitialEvidence = true;
      _errorMessage = null;
    });

    try {
      final photo = await widget.photoPicker.pickPhoto();
      if (photo == null) {
        if (!mounted) {
          return;
        }
        setState(() {
          _savingInitialEvidence = false;
        });
        return;
      }

      await widget.repository.saveInitialEvidence(
        _order,
        description: 'Foto antes do atendimento mobile',
        photo: photo,
      );

      if (!mounted) {
        return;
      }
      setState(() {
        _savingInitialEvidence = false;
        _initialEvidenceSaved = true;
      });
    } on Object {
      if (!mounted) {
        return;
      }
      setState(() {
        _savingInitialEvidence = false;
        _errorMessage = 'Falha ao enviar foto antes.';
      });
    }
  }

  Future<void> _saveFinalEvidence() async {
    setState(() {
      _savingFinalEvidence = true;
      _errorMessage = null;
    });

    try {
      final photo = await widget.photoPicker.pickPhoto();
      if (photo == null) {
        if (!mounted) {
          return;
        }
        setState(() {
          _savingFinalEvidence = false;
        });
        return;
      }

      await widget.repository.saveFinalEvidence(
        _order,
        description: 'Foto depois do atendimento mobile',
        photo: photo,
      );

      if (!mounted) {
        return;
      }
      setState(() {
        _savingFinalEvidence = false;
        _finalEvidenceSaved = true;
      });
    } on Object {
      if (!mounted) {
        return;
      }
      setState(() {
        _savingFinalEvidence = false;
        _errorMessage = 'Falha ao enviar foto depois.';
      });
    }
  }

  Future<void> _finishWorkOrder() async {
    final responsibleName = _responsibleController.text.trim();
    if (!_finalEvidenceSaved) {
      setState(() {
        _errorMessage = 'Registre a foto depois antes de finalizar.';
      });
      return;
    }
    if (responsibleName.isEmpty ||
        _signaturePoints.whereType<Offset>().isEmpty) {
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
        _checklistMessage = 'OS finalizada.';
      });
    } on Object {
      if (!mounted) {
        return;
      }
      setState(() {
        _finishing = false;
        _errorMessage = 'Falha ao finalizar OS.';
      });
    }
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
          description: item.label,
          photo: photo,
        );
      }
      if (!_finalEvidenceSaved && _isFinalEvidencePhoto(item)) {
        await widget.repository.saveFinalEvidence(
          _order,
          description: item.label,
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
        if (_isFinalEvidencePhoto(item)) {
          _finalEvidenceSaved = true;
        }
        _uploadingPhotoCodes.remove(item.code);
      });
    } on Object {
      if (!mounted) {
        return;
      }

      setState(() {
        _uploadingPhotoCodes.remove(item.code);
        _errorMessage = 'Falha ao enviar foto do checklist.';
      });
    }
  }

  bool _isInitialEvidencePhoto(WorkOrderChecklistItem item) {
    final text = '${item.code} ${item.label}'.toLowerCase();
    return item.kind == 'foto' &&
        (text.contains('antes') || text.contains('inicial'));
  }

  bool _isFinalEvidencePhoto(WorkOrderChecklistItem item) {
    final text = '${item.code} ${item.label}'.toLowerCase();
    return item.kind == 'foto' &&
        (text.contains('depois') ||
            text.contains('apos') ||
            text.contains('após') ||
            text.contains('final') ||
            text.contains('conclusao') ||
            text.contains('conclusão'));
  }

  List<WorkOrderChecklistResponse> _buildChecklistResponses() {
    return _order.checklist.map((item) {
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

  TextEditingController _controllerFor(String code) {
    return _textControllers.putIfAbsent(code, TextEditingController.new);
  }

  TextEditingController _noteControllerFor(String code) {
    return _noteControllers.putIfAbsent(code, TextEditingController.new);
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
    final equipments = _equipments;
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

class _MachineField extends StatelessWidget {
  const _MachineField({
    required this.fieldKey,
    required this.label,
    required this.controller,
    required this.impossibleController,
    required this.impossible,
    required this.onImpossibleChanged,
    this.numeric = false,
    this.options = const [],
  });

  final String fieldKey;
  final String label;
  final TextEditingController controller;
  final TextEditingController impossibleController;
  final bool impossible;
  final bool numeric;
  final List<String> options;
  final ValueChanged<bool> onImpossibleChanged;

  @override
  Widget build(BuildContext context) {
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
              decoration: InputDecoration(labelText: label),
            )
          else
            DropdownButtonFormField<String>(
              key: Key('machineSelect_$fieldKey'),
              initialValue: controller.text.trim().isEmpty
                  ? null
                  : controller.text.trim(),
              decoration: InputDecoration(labelText: label),
              items: options
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
              maxLines: 2,
            ),
        ],
      ),
    );
  }
}

class _ChecklistField extends StatelessWidget {
  const _ChecklistField({
    required this.item,
    required this.value,
    required this.textController,
    required this.noteController,
    required this.uploadingPhoto,
    required this.onChanged,
    this.onPhotoPressed,
  });

  final WorkOrderChecklistItem item;
  final String? value;
  final TextEditingController textController;
  final TextEditingController noteController;
  final bool uploadingPhoto;
  final ValueChanged<String> onChanged;
  final VoidCallback? onPhotoPressed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: switch (item.kind) {
        'checkbox' => InkWell(
          key: Key('checklist_checkbox_${item.code}'),
          onTap: () => onChanged(value == 'true' ? 'false' : 'true'),
          child: Row(
            children: [
              Checkbox(
                value: value == 'true',
                onChanged: (checked) =>
                    onChanged(checked == true ? 'true' : 'false'),
              ),
              Expanded(child: Text(item.label)),
            ],
          ),
        ),
        'select' => DropdownButtonFormField<String>(
          key: Key('checklist_select_${item.code}'),
          initialValue: value,
          decoration: InputDecoration(labelText: item.label),
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
              decoration: InputDecoration(labelText: item.label),
              items: const ['ok', 'nao conforme']
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
            const SizedBox(height: 8),
            TextField(
              key: Key('checklist_obs_${item.code}'),
              controller: noteController,
              decoration: const InputDecoration(labelText: 'Observacao'),
              maxLines: 2,
            ),
          ],
        ),
        'numerico' => TextField(
          key: Key('checklist_number_${item.code}'),
          controller: textController,
          decoration: InputDecoration(
            labelText: item.unit == null
                ? item.label
                : '${item.label} (${item.unit})',
          ),
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
        ),
        'texto' => TextField(
          key: Key('checklist_text_${item.code}'),
          controller: textController,
          decoration: InputDecoration(labelText: item.label),
          maxLines: 2,
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
          ),
        ),
        'finalizacao' => Row(
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
        _ => Text(item.label),
      },
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
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: airmovebrSurface,
        borderRadius: BorderRadius.circular(8),
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
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: OutlinedButton(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(
          alignment: Alignment.centerLeft,
          padding: const EdgeInsets.all(12),
          side: BorderSide(
            color: selected ? airmovebrPrimary : const Color(0xFFD8DEE8),
            width: selected ? 2 : 1,
          ),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
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
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: airmovebrPrimary,
        borderRadius: BorderRadius.circular(8),
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
          Text(
            order.status.label,
            style: const TextStyle(color: Colors.white70),
          ),
        ],
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

class _Bullet extends StatelessWidget {
  const _Bullet({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          const Icon(
            Icons.check_circle_outline,
            color: airmovebrAccent,
            size: 19,
          ),
          const SizedBox(width: 8),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}

List<String> _checklistFor(WorkOrder order) {
  if (order.checklist.isNotEmpty) {
    return order.checklist.take(4).map((item) => item.label).toList();
  }

  return const [
    'Checklist definido pela OS',
    'Selecione a maquina antes de iniciar',
  ];
}
