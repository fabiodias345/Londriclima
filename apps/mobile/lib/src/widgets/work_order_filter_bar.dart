import 'package:flutter/material.dart';

import '../models/work_order.dart';

class WorkOrderFilterBar extends StatelessWidget {
  const WorkOrderFilterBar({
    super.key,
    required this.selected,
    required this.onChanged,
  });

  final WorkOrderFilter selected;
  final ValueChanged<WorkOrderFilter> onChanged;

  @override
  Widget build(BuildContext context) {
    final filters = [
      _FilterItem(WorkOrderFilter.all, 'Todas', const Key('filterAllButton')),
      _FilterItem(
        WorkOrderFilter.today,
        'Hoje',
        const Key('filterTodayButton'),
      ),
      _FilterItem(
        WorkOrderFilter.pending,
        'Pendentes',
        const Key('filterPendingButton'),
      ),
      _FilterItem(
        WorkOrderFilter.inProgress,
        'Em andamento',
        const Key('filterInProgressButton'),
      ),
      _FilterItem(
        WorkOrderFilter.done,
        'Concluídas',
        const Key('filterDoneButton'),
      ),
      _FilterItem(
        WorkOrderFilter.waitingSync,
        'Aguardando sync',
        const Key('filterWaitingSyncButton'),
      ),
    ];

    return SizedBox(
      height: 42,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: filters.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final item = filters[index];
          return ChoiceChip(
            key: item.key,
            label: Text(item.label, maxLines: 1, overflow: TextOverflow.fade),
            selected: selected == item.filter,
            onSelected: (_) => onChanged(item.filter),
          );
        },
      ),
    );
  }
}

class _FilterItem {
  const _FilterItem(this.filter, this.label, this.key);

  final WorkOrderFilter filter;
  final String label;
  final Key key;
}
