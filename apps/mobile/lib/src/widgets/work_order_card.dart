import 'package:flutter/material.dart';

import '../models/work_order.dart';
import '../theme/app_theme.dart';

class WorkOrderCard extends StatelessWidget {
  const WorkOrderCard({super.key, required this.order, required this.onTap});

  final WorkOrder order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: airmovebrBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      order.clientName,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: airmovebrText,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  _StatusPill(status: order.status),
                ],
              ),
              const SizedBox(height: 10),
              _InfoLine(icon: Icons.place_outlined, text: order.address),
              const SizedBox(height: 6),
              _InfoLine(icon: Icons.ac_unit, text: order.equipment),
              const SizedBox(height: 6),
              _InfoLine(
                icon: Icons.inventory_2_outlined,
                text: order.equipmentCountLabel,
              ),
              const SizedBox(height: 6),
              _InfoLine(icon: Icons.build_outlined, text: order.serviceLabel),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      _shortOrderId(order.id),
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                  ),
                  const Icon(Icons.chevron_right, color: airmovebrMuted),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _shortOrderId(String id) {
  if (id.length <= 13) {
    return id;
  }

  return '${id.substring(0, 8)}...${id.substring(id.length - 4)}';
}

class _InfoLine extends StatelessWidget {
  const _InfoLine({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: airmovebrMuted),
        const SizedBox(width: 8),
        Expanded(
          child: Text(text, style: const TextStyle(color: airmovebrMuted)),
        ),
      ],
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.status});

  final WorkOrderStatus status;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: airmovebrAccent.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        child: Text(
          status.label,
          style: const TextStyle(
            color: airmovebrPrimary,
            fontWeight: FontWeight.w800,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}
