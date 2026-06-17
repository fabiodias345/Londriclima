import 'package:airmovebr_mobile/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('login de teste abre dashboard com botoes Cliente e Carro', (
    tester,
  ) async {
    await tester.pumpWidget(const AirmovebrApp());

    expect(find.text('Acesso AIRMOVEBR'), findsOneWidget);
    expect(find.byKey(const Key('loginUserField')), findsOneWidget);
    expect(find.byKey(const Key('loginPasswordField')), findsOneWidget);

    await tester.enterText(find.byKey(const Key('loginUserField')), 'teste');
    await tester.enterText(
      find.byKey(const Key('loginPasswordField')),
      '123456',
    );
    await tester.tap(find.byKey(const Key('loginSubmitButton')));
    await tester.pumpAndSettle();

    expect(find.text('Dashboard'), findsOneWidget);
    expect(find.byType(Image), findsNothing);
    expect(find.text('Cliente'), findsOneWidget);
    expect(find.text('Carro'), findsOneWidget);
  });

  testWidgets('login invalido mostra mensagem de erro', (tester) async {
    await tester.pumpWidget(const AirmovebrApp());

    await tester.enterText(find.byKey(const Key('loginUserField')), 'teste');
    await tester.enterText(
      find.byKey(const Key('loginPasswordField')),
      'errada',
    );
    await tester.tap(find.byKey(const Key('loginSubmitButton')));
    await tester.pump();

    expect(find.byKey(const Key('loginErrorMessage')), findsOneWidget);
    expect(find.text('Login ou senha invalido.'), findsOneWidget);
  });
}
