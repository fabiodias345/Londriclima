import 'package:flutter/material.dart';

import '../models/work_order.dart';

Future<SafetyCheckInput?> showSafetyCheckDialog(BuildContext context) {
  return showDialog<SafetyCheckInput>(
    context: context,
    barrierDismissible: false,
    builder: (_) => const _SafetyCheckDialog(),
  );
}

class _SafetyCheckDialog extends StatefulWidget {
  const _SafetyCheckDialog();

  @override
  State<_SafetyCheckDialog> createState() => _SafetyCheckDialogState();
}

class _SafetyCheckDialogState extends State<_SafetyCheckDialog> {
  bool _ppe = false;
  bool _powerOff = false;
  bool _safeArea = false;
  bool _height = false;
  bool _nr35 = false;
  bool _harness = false;
  bool _lanyard = false;
  bool _isolated = false;

  SafetyCheckInput get _value => SafetyCheckInput(
    ppeConfirmed: _ppe,
    equipmentPoweredOff: _powerOff,
    safeAreaAndTools: _safeArea,
    workAtHeight: _height,
    nr35Valid: _nr35,
    parachuteHarness: _harness,
    anchoredLanyard: _lanyard,
    isolatedArea: _isolated,
  );

  @override
  Widget build(BuildContext context) {
    final value = _value;
    return AlertDialog(
      title: const Text('Segurança antes da O.S.'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _check(
              'safety_epi',
              'EPIs obrigatórios confirmados',
              _ppe,
              (v) => _ppe = v,
            ),
            _check(
              'safety_power',
              'Equipamento desligado',
              _powerOff,
              (v) => _powerOff = v,
            ),
            _check(
              'safety_area',
              'Área e ferramentas seguras',
              _safeArea,
              (v) => _safeArea = v,
            ),
            _check(
              'safety_height',
              'Trabalho acima de 2 metros com risco de queda',
              _height,
              (v) {
                _height = v;
                if (!v) {
                  _nr35 = false;
                  _harness = false;
                  _lanyard = false;
                  _isolated = false;
                }
              },
            ),
            if (_height) ...[
              const Divider(),
              _check('safety_nr35', 'NR-35 válida', _nr35, (v) => _nr35 = v),
              _check(
                'safety_harness',
                'Cinto paraquedista',
                _harness,
                (v) => _harness = v,
              ),
              _check(
                'safety_lanyard',
                'Talabarte ancorado',
                _lanyard,
                (v) => _lanyard = v,
              ),
              _check(
                'safety_isolated',
                'Área isolada',
                _isolated,
                (v) => _isolated = v,
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          key: const Key('safety_confirm'),
          onPressed: () => Navigator.pop(context, value),
          child: Text(
            value.approved ? 'Confirmar e iniciar' : 'Registrar bloqueio',
          ),
        ),
      ],
    );
  }

  Widget _check(
    String key,
    String label,
    bool value,
    ValueChanged<bool> update,
  ) {
    return CheckboxListTile(
      key: Key(key),
      contentPadding: EdgeInsets.zero,
      title: Text(label),
      value: value,
      onChanged: (checked) => setState(() => update(checked == true)),
      controlAffinity: ListTileControlAffinity.leading,
    );
  }
}
