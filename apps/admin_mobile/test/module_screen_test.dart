import 'package:clima_admin_mobile/src/screens/admin_module.dart';
import 'package:clima_admin_mobile/src/screens/module_screen.dart';
import 'package:clima_admin_mobile/src/services/admin_api_client.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

class FakeModuleApiClient extends AdminApiClient {
  FakeModuleApiClient(this.responses)
      : super(baseUrl: Uri.parse('https://api.test'));

  final Map<String, Map<String, dynamic>> responses;

  @override
  Future<Map<String, dynamic>> getJson(
    String path,
    AdminSession session,
  ) async {
    return responses[path] ?? <String, dynamic>{};
  }
}

const _session = AdminSession(
  accessToken: 'access',
  refreshToken: 'refresh',
  userName: 'Admin',
  email: 'admin@test.local',
);

Widget _moduleApp({
  required AdminModuleKind kind,
  required Map<String, Map<String, dynamic>> responses,
}) {
  return MaterialApp(
    home: ModuleScreen(
      item: DashboardItem(
        kind,
        kind == AdminModuleKind.fleet ? 'Frota' : 'O.S.',
        'Consulta administrativa',
        Icons.list_alt,
        const Color(0xFF176B87),
      ),
      session: _session,
      apiClient: FakeModuleApiClient(responses),
    ),
  );
}

void main() {
  testWidgets('filtra linhas por busca e status', (tester) async {
    await tester.pumpWidget(
      _moduleApp(
        kind: AdminModuleKind.orders,
        responses: {
          '/admin/agenda': {
            'items': [
              {
                'id': '1',
                'titulo': 'OS Hospital',
                'status': 'aberta',
                'cliente': {'nome': 'Hospital Norte'},
              },
              {
                'id': '2',
                'titulo': 'OS Loja',
                'status': 'concluida',
                'cliente': {'nome': 'Loja Centro'},
              },
            ],
          },
        },
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const Key('module-search')),
      'hospital',
    );
    await tester.pump();
    expect(find.text('OS Hospital'), findsOneWidget);
    expect(find.text('OS Loja'), findsNothing);

    await tester.tap(find.text('Concluidas'));
    await tester.pump();
    expect(find.text('OS Hospital'), findsNothing);
  });

  testWidgets('frota abre detalhes somente leitura em tela pequena', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(320, 568));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(
      _moduleApp(
        kind: AdminModuleKind.fleet,
        responses: {
          '/admin/frota/veiculos': {
            'items': [
              {
                'id': 'v1',
                'nome': 'Van 1',
                'placa': 'ABC1D23',
                'rastreador_imei': '123456',
                'ativo': true,
              },
            ],
          },
          '/admin/relatorios/frota': {
            'km_rodados': 120,
            'litros': 30,
          },
        },
      ),
    );
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    await tester.ensureVisible(find.text('Van 1'));
    await tester.tap(find.text('Van 1'));
    await tester.pumpAndSettle();
    expect(find.text('Detalhes do veiculo'), findsOneWidget);
    expect(find.text('Salvar'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
