import 'package:flutter/material.dart';

import '../models/annual_checklist_flow.dart';

class AnnualChecklistStageSelector extends StatelessWidget {
  const AnnualChecklistStageSelector({
    super.key,
    required this.value,
    required this.completedStages,
    required this.onChanged,
  });

  final AnnualChecklistStage value;
  final Set<AnnualChecklistStage> completedStages;
  final ValueChanged<AnnualChecklistStage> onChanged;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      key: const Key('annualStageSelector'),
      spacing: 8,
      children: AnnualChecklistStage.values
          .map(
            (stage) => ChoiceChip(
              key: Key('annualStage_${stage.code}'),
              label: Text(stage.label),
              avatar: completedStages.contains(stage)
                  ? Icon(
                      Icons.check_circle,
                      key: Key('annualStageCompleted_${stage.code}'),
                      size: 18,
                    )
                  : null,
              selected: value == stage,
              onSelected: (_) => onChanged(stage),
            ),
          )
          .toList(),
    );
  }
}
