import 'package:flutter/material.dart';

import '../models/work_order.dart';
import '../theme/app_theme.dart';

class StatusSummary extends StatelessWidget {
  const StatusSummary({super.key, required this.orders});

  final List<WorkOrder> orders;

  @override
  Widget build(BuildContext context) {
    final pending = orders
        .where((order) => order.status == WorkOrderStatus.pending)
        .length;
    final inProgress = orders
        .where((order) => order.status == WorkOrderStatus.inProgress)
        .length;
    final waitingSync = orders
        .where((order) => order.status == WorkOrderStatus.waitingSync)
        .length;

    return Row(
      children: [
        Expanded(
          child: _Metric(label: 'Pendentes', value: pending.toString()),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _Metric(label: 'Em campo', value: inProgress.toString()),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _Metric(label: 'Sync', value: waitingSync.toString()),
        ),
      ],
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: airmovebrBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 2),
          FittedBox(
            alignment: Alignment.centerLeft,
            fit: BoxFit.scaleDown,
            child: Text(
              label,
              maxLines: 1,
              style: Theme.of(
                context,
              ).textTheme.labelMedium?.copyWith(color: airmovebrMuted),
            ),
          ),
        ],
      ),
    );
  }
}
