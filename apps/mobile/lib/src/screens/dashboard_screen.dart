import 'package:flutter/material.dart';

import '../models/work_order.dart';
import '../repositories/work_order_repository.dart';
import '../services/location_service.dart';
import '../theme/app_theme.dart';
import 'work_order_detail_screen.dart';
import '../widgets/status_summary.dart';
import '../widgets/work_order_card.dart';
import '../widgets/work_order_filter_bar.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({
    super.key,
    required this.repository,
    required this.locationService,
    required this.photoPicker,
  });

  final WorkOrderRepository repository;
  final LocationService locationService;
  final ChecklistPhotoPicker photoPicker;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  WorkOrderFilter _filter = WorkOrderFilter.today;
  late Future<List<WorkOrder>> _ordersFuture;
  bool _syncing = false;

  @override
  void initState() {
    super.initState();
    _ordersFuture = widget.repository.listMine();
  }

  void _reload() {
    setState(() {
      _ordersFuture = widget.repository.listMine();
    });
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
                _Header(total: orders.length),
                const SizedBox(height: 18),
                StatusSummary(orders: orders),
                const SizedBox(height: 18),
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
            );
          },
        ),
      ),
    );
  }

  Future<void> _openOrder(WorkOrder order) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => WorkOrderDetailScreen(
          order: order,
          repository: widget.repository,
          locationService: widget.locationService,
          photoPicker: widget.photoPicker,
        ),
      ),
    );

    if (mounted) {
      _reload();
    }
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

class _Header extends StatelessWidget {
  const _Header({required this.total});

  final int total;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Minhas manutenções',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            color: airmovebrText,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          '$total ordens carregadas para trabalho de campo.',
          style: Theme.of(
            context,
          ).textTheme.bodyMedium?.copyWith(color: airmovebrMuted),
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
