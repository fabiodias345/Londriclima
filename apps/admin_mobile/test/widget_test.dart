import 'package:clima_admin_mobile/src/app.dart';
import 'package:clima_admin_mobile/src/services/admin_api_client.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

class FakeAdminApiClient extends AdminApiClient {
  FakeAdminApiClient({
    required this.result,
  }) : super(baseUrl: Uri.parse('https://api.test'));

  final Object result;

  @override
  Future<AdminSession> login(String login, String password) async {
    if (result is AdminSession) return result as AdminSession;
    throw result as AdminLoginException;
  }
}

void main() {
  testWidgets('mostra login administrativo', (tester) async {
    await tester.pumpWidget(
      ClimaAdminApp(
        apiClient: FakeAdminApiClient(
          result: AdminSession(
            accessToken: 'access',
            refreshToken: 'refresh',
            userName: 'Admin',
            email: 'admin@test.local',
          ),
        ),
      ),
    );

    expect(find.text('Clima Admin'), findsOneWidget);
    expect(find.text('Entrar como admin'), findsOneWidget);
    expect(find.text('Tecnico e auxiliar nao acessam este app.'), findsOneWidget);
  });

  testWidgets('bloqueia usuario que nao e admin', (tester) async {
    await tester.pumpWidget(
      ClimaAdminApp(
        apiClient: FakeAdminApiClient(
          result: AdminLoginException(AdminLoginFailure.forbiddenRole),
        ),
      ),
    );

    await tester.enterText(find.byType(TextField).first, 'tecnico');
    await tester.enterText(find.byType(TextField).last, '123456');
    await tester.tap(find.text('Entrar como admin'));
    await tester.pumpAndSettle();

    expect(find.text('Acesso restrito a administradores.'), findsOneWidget);
  });

  testWidgets('admin entra no painel com botoes coloridos', (tester) async {
    await tester.pumpWidget(
      ClimaAdminApp(
        apiClient: FakeAdminApiClient(
          result: AdminSession(
            accessToken: 'access',
            refreshToken: 'refresh',
            userName: 'Admin Geral',
            email: 'admin@test.local',
          ),
        ),
      ),
    );

    await tester.enterText(find.byType(TextField).first, 'admin');
    await tester.enterText(find.byType(TextField).last, '123456');
    await tester.tap(find.text('Entrar como admin'));
    await tester.pumpAndSettle();

    expect(find.text('Admin Geral'), findsOneWidget);
    expect(find.text('O.S.'), findsOneWidget);
    expect(find.text('Agenda'), findsOneWidget);
    expect(find.text('PMOC'), findsOneWidget);
    expect(find.text('Frota'), findsOneWidget);
  });
}
