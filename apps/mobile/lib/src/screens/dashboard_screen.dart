import 'package:flutter/material.dart';

import '../models/work_order.dart';
import '../repositories/fleet_repository.dart';
import '../repositories/work_order_repository.dart';
import '../services/barcode_scanner_service.dart';
import '../services/location_service.dart';
import '../theme/app_theme.dart';
import '../widgets/work_order_card.dart';
import '../widgets/work_order_filter_bar.dart';
import 'fueling_screen.dart';
import 'work_order_detail_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({
    super.key,
    required this.repository,
    required this.fleetRepository,
    required this.locationService,
    required this.photoPicker,
    required this.barcodeScanner,
    this.technicianName = '',
  });

  final WorkOrderRepository repository;
  final FleetRepository fleetRepository;
  final LocationService locationService;
  final ChecklistPhotoPicker photoPicker;
  final BarcodeScannerService barcodeScanner;
  final String technicianName;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  WorkOrderFilter _filter = WorkOrderFilter.all;
  late Future<List<WorkOrder>> _ordersFuture;
  bool _syncing = false;
  bool _showMaintenance = false;

  @override
  void initState() {
    super.initState();
    _ordersFuture = widget.repository.listMine();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('AIRMOVEBR'), actions: [_syncButton()]),
      body: SafeArea(
        child: FutureBuilder<List<WorkOrder>>(
          future: _ordersFuture,
          builder: (context, snapshot) {
            final orders = snapshot.data ?? const <WorkOrder>[];
            final visible = orders
                .where((order) => order.matches(_filter, DateTime.now()))
                .toList();

            return ListView(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 24),
              children: [
                _DashboardActions(
                  onMaintenanceTap: () => setState(() {
                    _showMaintenance = true;
                  }),
                  onFuelingTap: _openFueling,
                ),
                if (_showMaintenance) ...[
                  const SizedBox(height: 24),
                  Text(
                    'Ordens de servico',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 14),
                  WorkOrderFilterBar(
                    selected: _filter,
                    onChanged: (value) => setState(() => _filter = value),
                  ),
                  const SizedBox(height: 16),
                  if (snapshot.connectionState == ConnectionState.waiting)
                    const Center(child: CircularProgressIndicator())
                  else if (visible.isEmpty)
                    const _EmptyState()
                  else
                    ...visible.map(
                      (order) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: WorkOrderCard(
                          order: order,
                          onTap: () => _openOrder(order),
                        ),
                      ),
                    ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }

  Future<void> _openOrder(WorkOrder order) async {
    final updated = await Navigator.of(context).push<WorkOrder>(
      MaterialPageRoute<WorkOrder>(
        builder: (_) => WorkOrderDetailScreen(
          order: order,
          repository: widget.repository,
          locationService: widget.locationService,
          photoPicker: widget.photoPicker,
          barcodeScanner: widget.barcodeScanner,
          technicianName: widget.technicianName,
        ),
      ),
    );

    if (mounted) {
      setState(() {
        _showMaintenance = true;
        _ordersFuture = widget.repository.listMine();
      });
      if (updated != null) {
        final message = updated.status == WorkOrderStatus.waitingSync
            ? 'Finalizacao aguardando sincronizacao.'
            : 'OS finalizada.';
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(message)));
      }
    }
  }

  Future<void> _openFueling() async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => FuelingScreen(repository: widget.fleetRepository),
      ),
    );
  }

  Widget _syncButton() {
    return IconButton(
      key: const Key('syncNowButton'),
      tooltip: 'Sincronizar',
      onPressed: _syncing ? null : _syncNow,
      icon: _syncing
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : const Icon(Icons.sync),
    );
  }

  Future<void> _syncNow() async {
    setState(() {
      _syncing = true;
    });
    final result = await widget.repository.syncPending();
    if (!mounted) {
      return;
    }
    setState(() {
      _syncing = false;
      _ordersFuture = widget.repository.listMine();
    });
    final message = result.synced == 0 && result.failed == 0
        ? 'Nada pendente para sincronizar.'
        : 'Sincronizadas: ${result.synced}. Pendentes: ${result.failed}.';
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }
}

class _DashboardActions extends StatelessWidget {
  const _DashboardActions({
    required this.onMaintenanceTap,
    required this.onFuelingTap,
  });

  final VoidCallback onMaintenanceTap;
  final VoidCallback onFuelingTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        FilledButton.icon(
          key: const Key('myMaintenanceButton'),
          onPressed: onMaintenanceTap,
          icon: const Icon(Icons.assignment_outlined, size: 24),
          label: const Text('Minhas manutencoes'),
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(64),
            backgroundColor: airmovebrPrimary,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            textStyle: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          key: const Key('fuelingButton'),
          onPressed: onFuelingTap,
          icon: const Icon(Icons.local_gas_station_outlined, size: 24),
          label: const Text('Abastecimentos'),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(64),
            foregroundColor: airmovebrPrimary,
            side: const BorderSide(color: airmovebrAccent, width: 2),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            textStyle: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
      ],
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return const Card(
      child: Padding(
        padding: EdgeInsets.all(18),
        child: Text('Nenhuma OS neste filtro.'),
      ),
    );
  }
}
