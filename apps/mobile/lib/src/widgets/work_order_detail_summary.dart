import 'package:flutter/material.dart';

import '../models/work_order.dart';
import '../theme/app_theme.dart';

class WorkOrderHeaderCard extends StatelessWidget {
  const WorkOrderHeaderCard({super.key, required this.order});

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
      key: const Key('workOrderHeaderCard'),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: airmovebrPrimary,
        borderRadius: BorderRadius.circular(22),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33073A55),
            blurRadius: 22,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            order.clientName,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              height: 1.05,
            ),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _SummaryPill(
                label: order.status.label,
                color: statusColor,
                backgroundColor: Colors.white,
                icon: Icons.radio_button_checked_rounded,
              ),
              _SummaryPill(
                label: order.serviceLabel,
                color: airmovebrPrimary,
                backgroundColor: const Color(0xFFEAF4FF),
                icon: Icons.event_repeat_rounded,
              ),
              _SummaryPill(
                label: order.equipmentCountLabel,
                color: const Color(0xFF5F3B00),
                backgroundColor: const Color(0xFFFFF3D8),
                icon: Icons.ac_unit_rounded,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class MachineSearchScanRow extends StatelessWidget {
  const MachineSearchScanRow({
    super.key,
    required this.onSearchChanged,
    required this.onScan,
  });

  final ValueChanged<String> onSearchChanged;
  final VoidCallback onScan;

  @override
  Widget build(BuildContext context) {
    return Row(
      key: const Key('machineSearchScanRow'),
      children: [
        Expanded(
          child: TextField(
            key: const Key('machineSearchField'),
            decoration: const InputDecoration(
              labelText: 'Buscar por TAG, local ou modelo',
              prefixIcon: Icon(Icons.search_rounded),
            ),
            onChanged: onSearchChanged,
          ),
        ),
        const SizedBox(width: 10),
        Semantics(
          label: 'Ler QR ou código de barras',
          button: true,
          child: Container(
            key: const Key('scanEquipmentInlineButton'),
            height: 56,
            width: 56,
            decoration: BoxDecoration(
              color: const Color(0xFFEAF4FF),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: airmovebrBorder),
            ),
            child: IconButton(
              key: const Key('scanEquipmentButton'),
              onPressed: onScan,
              tooltip: 'Ler QR / código de barras',
              icon: const Icon(Icons.qr_code_scanner_outlined),
              color: airmovebrPrimary,
            ),
          ),
        ),
      ],
    );
  }
}

class _SummaryPill extends StatelessWidget {
  const _SummaryPill({
    required this.label,
    required this.color,
    required this.backgroundColor,
    required this.icon,
  });

  final String label;
  final Color color;
  final Color backgroundColor;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 15, color: color),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.w900,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
