import 'package:airmovebr_mobile/main.dart';
import 'package:airmovebr_mobile/src/auth/mobile_login_gateway.dart';
import 'package:airmovebr_mobile/src/models/work_order.dart';
import 'package:airmovebr_mobile/src/services/location_service.dart';
import 'package:airmovebr_mobile/src/repositories/work_order_repository.dart';
import 'package:airmovebr_mobile/src/screens/login_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('login de teste abre dashboard operacional com ordens fake', (
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

    expect(find.text('Minhas manutenções'), findsOneWidget);
    expect(find.byType(Image), findsNothing);
    expect(find.text('Hoje'), findsOneWidget);
    expect(find.byKey(const Key('filterPendingButton')), findsOneWidget);
    expect(find.text('Aguardando sync'), findsOneWidget);
    expect(find.text('Hospital Norte'), findsOneWidget);
    expect(find.text('3 equipamentos'), findsOneWidget);
    expect(find.text('Split Hi-Wall 24.000 BTUs'), findsOneWidget);
    expect(find.byKey(const Key('syncNowButton')), findsOneWidget);
  });

  testWidgets('filtro pendentes mostra somente OS pendente', (tester) async {
    await tester.pumpWidget(const AirmovebrApp());

    await tester.enterText(find.byKey(const Key('loginUserField')), 'teste');
    await tester.enterText(
      find.byKey(const Key('loginPasswordField')),
      '123456',
    );
    await tester.tap(find.byKey(const Key('loginSubmitButton')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('filterPendingButton')));
    await tester.pumpAndSettle();

    expect(find.text('Hospital Norte'), findsOneWidget);
    expect(find.text('Clínica Centro'), findsNothing);
  });

  testWidgets('toque no card abre detalhe da OS', (tester) async {
    await tester.pumpWidget(const AirmovebrApp());

    await tester.enterText(find.byKey(const Key('loginUserField')), 'teste');
    await tester.enterText(
      find.byKey(const Key('loginPasswordField')),
      '123456',
    );
    await tester.tap(find.byKey(const Key('loginSubmitButton')));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Hospital Norte'));
    await tester.pumpAndSettle();

    expect(find.text('Detalhes da OS'), findsOneWidget);
    expect(find.text('OS-1042'), findsOneWidget);
    expect(find.text('Equipamentos deste atendimento'), findsOneWidget);
    expect(find.text('Evaporadora sala 101'), findsOneWidget);
    expect(find.text('Evaporadora sala 102'), findsOneWidget);
    expect(find.text('Condensadora cobertura'), findsOneWidget);

    await tester.scrollUntilVisible(find.text('Checklist previsto'), 240);

    expect(find.text('Checklist previsto'), findsOneWidget);

    await tester.scrollUntilVisible(find.text('Obrigatorios da execucao'), 240);

    expect(find.text('Obrigatorios da execucao'), findsOneWidget);

    await tester.scrollUntilVisible(find.text('Iniciar servico'), 240);

    expect(find.text('Iniciar servico'), findsOneWidget);
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

  testWidgets('login via gateway usa ordens vindas da API', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _GatewayDeTeste(repository: _RepositorioDeTeste()),
        ),
      ),
    );

    await tester.enterText(
      find.byKey(const Key('loginUserField')),
      'tecnico@airmovebr.local',
    );
    await tester.enterText(
      find.byKey(const Key('loginPasswordField')),
      '123456',
    );
    await tester.tap(find.byKey(const Key('loginSubmitButton')));
    await tester.pumpAndSettle();

    expect(find.text('Cliente API'), findsOneWidget);
  });

  testWidgets('botao iniciar servico muda OS para em andamento', (
    tester,
  ) async {
    final repository = _RepositorioDeTeste();
    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _GatewayDeTeste(repository: repository),
          locationService: const _LocationServiceTeste(),
        ),
      ),
    );

    await tester.enterText(
      find.byKey(const Key('loginUserField')),
      'tecnico@airmovebr.local',
    );
    await tester.enterText(
      find.byKey(const Key('loginPasswordField')),
      '123456',
    );
    await tester.tap(find.byKey(const Key('loginSubmitButton')));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Cliente API'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Iniciar servico'), 240);
    await tester.tap(find.text('Iniciar servico'));
    await tester.pumpAndSettle();

    expect(repository.startedOrderId, 'OS-API');
    await tester.drag(find.byType(ListView), const Offset(0, 1000));
    await tester.pumpAndSettle();
    expect(find.text('Em andamento'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Cheguei ao cliente'), 240);
    expect(find.text('Cheguei ao cliente'), findsOneWidget);
  });

  testWidgets('botao cheguei ao cliente libera checklist', (tester) async {
    final repository = _RepositorioDeTeste();
    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _GatewayDeTeste(repository: repository),
          locationService: const _LocationServiceTeste(),
        ),
      ),
    );

    await tester.enterText(
      find.byKey(const Key('loginUserField')),
      'tecnico@airmovebr.local',
    );
    await tester.enterText(
      find.byKey(const Key('loginPasswordField')),
      '123456',
    );
    await tester.tap(find.byKey(const Key('loginSubmitButton')));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Cliente API'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Iniciar servico'), 240);
    await tester.tap(find.text('Iniciar servico'));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.byKey(const Key('arriveAtClientButton')),
      240,
    );
    await tester.drag(find.byType(ListView), const Offset(0, -80));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('arriveAtClientButton')));
    await tester.pumpAndSettle();

    expect(repository.arrivedOrderId, 'OS-API');
    expect(find.text('Checklist liberado'), findsOneWidget);
  });
}

class _GatewayDeTeste implements MobileLoginGateway {
  const _GatewayDeTeste({required this.repository});

  final WorkOrderRepository repository;

  @override
  Future<LoginSession?> login(String user, String password) async {
    return LoginSession(repository: repository);
  }
}

class _RepositorioDeTeste implements WorkOrderRepository {
  String? startedOrderId;
  String? arrivedOrderId;

  @override
  Future<List<WorkOrder>> listMine() async {
    return [
      WorkOrder(
        id: 'OS-API',
        clientName: 'Cliente API',
        address: 'Rua da API, 10',
        equipment: 'Split API',
        maintenanceType: 'Limpeza de filtros',
        scheduledAt: DateTime.now(),
        status: WorkOrderStatus.pending,
      ),
    ];
  }

  @override
  Future<WorkOrder> startService(WorkOrder order, GeoPoint location) async {
    startedOrderId = order.id;
    return order.copyWith(
      status: WorkOrderStatus.inProgress,
      backendStatus: 'em_deslocamento',
    );
  }

  @override
  Future<WorkOrder> arriveAtClient(WorkOrder order, GeoPoint location) async {
    arrivedOrderId = order.id;
    return order.copyWith(
      status: WorkOrderStatus.inProgress,
      backendStatus: 'em_atendimento',
    );
  }
}

class _LocationServiceTeste implements LocationService {
  const _LocationServiceTeste();

  @override
  Future<GeoPoint> currentLocation() async {
    return const GeoPoint(latitude: -23.3048, longitude: -51.1701);
  }
}
