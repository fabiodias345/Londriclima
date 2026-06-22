import 'package:flutter/material.dart';

import '../models/work_order.dart';
import '../repositories/work_order_repository.dart';
import '../services/location_service.dart';
import '../theme/app_theme.dart';
import '../widgets/detail_section.dart';

class WorkOrderDetailScreen extends StatefulWidget {
  const WorkOrderDetailScreen({
    super.key,
    required this.order,
    required this.repository,
    required this.locationService,
  });

  final WorkOrder order;
  final WorkOrderRepository repository;
  final LocationService locationService;

  @override
  State<WorkOrderDetailScreen> createState() => _WorkOrderDetailScreenState();
}

class _WorkOrderDetailScreenState extends State<WorkOrderDetailScreen> {
  late WorkOrder _order;
  bool _starting = false;
  bool _arriving = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _order = widget.order;
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
            if (_order.isOnRoute) ...[
              const SizedBox(height: 12),
              OutlinedButton.icon(
                key: const Key('arriveAtClientButton'),
                onPressed: _canArrive ? _arriveAtClient : null,
                icon: const Icon(Icons.place_outlined),
                label: Text(_arriveButtonLabel),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                  foregroundColor: airmovebrPrimary,
                ),
              ),
            ],
            if (_order.isAtClient) ...[
              const SizedBox(height: 12),
              FilledButton.icon(
                key: const Key('checklistReadyButton'),
                onPressed: () {},
                icon: const Icon(Icons.checklist_rounded),
                label: const Text('Checklist liberado'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                  backgroundColor: airmovebrPrimary,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  bool get _canStart => _order.status == WorkOrderStatus.pending && !_starting;

  bool get _canArrive => _order.isOnRoute && !_arriving;

  String get _startButtonLabel {
    if (_starting) {
      return 'Iniciando...';
    }

    if (_order.status == WorkOrderStatus.pending) {
      return 'Iniciar servico';
    }

    return 'Servico iniciado';
  }

  String get _arriveButtonLabel {
    return _arriving ? 'Registrando chegada...' : 'Cheguei ao cliente';
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

  Future<void> _arriveAtClient() async {
    setState(() {
      _arriving = true;
      _errorMessage = null;
    });

    try {
      final location = await widget.locationService.currentLocation();
      final updated = await widget.repository.arriveAtClient(_order, location);
      if (!mounted) {
        return;
      }

      setState(() {
        _order = updated;
        _arriving = false;
      });
    } on Object catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _arriving = false;
        _errorMessage = error is LocationServiceException
            ? error.message
            : 'Falha ao registrar chegada.';
      });
    }
  }
}

List<Widget> _equipmentWidgets(WorkOrder order) {
  final equipments = order.equipments.isEmpty
      ? [
          WorkOrderEquipment(
            id: order.id,
            name: order.equipment,
            location: order.address,
            model: order.equipment,
          ),
        ]
      : order.equipments;

  return equipments
      .map((equipment) => _EquipmentItem(equipment: equipment))
      .toList();
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
  final type = order.maintenanceType.toLowerCase();
  if (type.contains('filtro')) {
    return const [
      'Desligar equipamento',
      'Fotografar filtros',
      'Limpar filtros',
      'Verificar operacao final',
    ];
  }
  if (type.contains('completa')) {
    return const [
      'Executar checklist trimestral',
      'Verificar pressao',
      'Medir amperagem',
      'Inspecionar eletrica',
    ];
  }
  return const [
    'Foto inicial',
    'Inspecao geral',
    'Registro tecnico',
    'Foto final',
  ];
}
