import 'package:airmovebr_mobile/src/models/work_order.dart';
import 'package:airmovebr_mobile/src/screens/safety_check_dialog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'seguranca exige NR-35 somente quando houver trabalho em altura',
    (tester) async {
      SafetyCheckInput? result;
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => TextButton(
              onPressed: () async {
                result = await showSafetyCheckDialog(context);
              },
              child: const Text('Abrir'),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Abrir'));
      await tester.pumpAndSettle();
      expect(find.text('NR-35 válida'), findsNothing);

      await tester.tap(find.byKey(const Key('safety_height')));
      await tester.pumpAndSettle();
      expect(find.text('NR-35 válida'), findsOneWidget);

      for (final key in [
        'safety_epi',
        'safety_power',
        'safety_area',
        'safety_nr35',
        'safety_harness',
        'safety_lanyard',
        'safety_isolated',
      ]) {
        await tester.ensureVisible(find.byKey(Key(key)));
        await tester.pumpAndSettle();
        await tester.tap(find.byKey(Key(key)));
      }
      await tester.ensureVisible(find.byKey(const Key('safety_confirm')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('safety_confirm')));
      await tester.pumpAndSettle();

      expect(result?.approved, isTrue);
      expect(result?.workAtHeight, isTrue);
    },
  );
}
