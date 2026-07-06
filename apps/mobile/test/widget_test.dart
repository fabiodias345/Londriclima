import 'dart:io';

import 'package:airmovebr_mobile/main.dart';
import 'package:airmovebr_mobile/src/auth/fake_login_gateway.dart';
import 'package:airmovebr_mobile/src/auth/hybrid_login_gateway.dart';
import 'package:airmovebr_mobile/src/auth/mobile_login_gateway.dart';
import 'package:airmovebr_mobile/src/models/work_order.dart';
import 'package:airmovebr_mobile/src/services/location_service.dart';
import 'package:airmovebr_mobile/src/widgets/signature_pad.dart';
import 'package:airmovebr_mobile/src/services/barcode_scanner_service.dart';
import 'package:airmovebr_mobile/src/repositories/work_order_repository.dart';
import 'package:airmovebr_mobile/src/repositories/fleet_repository.dart';
import 'package:airmovebr_mobile/src/screens/login_screen.dart';
import 'package:airmovebr_mobile/src/screens/first_access_screen.dart';
import 'package:airmovebr_mobile/src/screens/work_order_detail_screen.dart';
import 'package:airmovebr_mobile/src/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('fake login aceita tecnico demo sem URL de API', () async {
    final fakeSession = await FakeLoginGateway().login(
      'tecnico@airmovebr.local',
      '123456',
    );
    final hybridSession = await HybridLoginGateway(
      apiBaseUrl: null,
      demoMode: true,
    ).login('tecnico@airmovebr.local', '123456');

    expect(fakeSession, isNotNull);
    expect(hybridSession, isNotNull);
  });

  testWidgets('login de teste abre dashboard operacional com ordens fake', (
    tester,
  ) async {
    await tester.pumpWidget(const AirmovebrApp(demoMode: true));

    expect(find.text('Acesso Clima do Brasil'), findsOneWidget);
    expect(find.byKey(const Key('loginUserField')), findsOneWidget);
    expect(find.byKey(const Key('loginPasswordField')), findsOneWidget);

    await tester.enterText(find.byKey(const Key('loginUserField')), 'teste');
    await tester.enterText(
      find.byKey(const Key('loginPasswordField')),
      '123456',
    );
    await tester.tap(find.byKey(const Key('loginSubmitButton')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('myMaintenanceButton')), findsOneWidget);
    expect(find.byKey(const Key('fuelingButton')), findsOneWidget);
    expect(find.byType(Image), findsNothing);
    expect(find.text('Pendentes'), findsNothing);
    expect(find.text('Em campo'), findsNothing);
    expect(find.text('Sync'), findsNothing);
    expect(find.byKey(const Key('filterPendingButton')), findsNothing);

    await _openMaintenance(tester);

    expect(find.text('Ordens de servico'), findsOneWidget);
    expect(find.byKey(const Key('filterPendingButton')), findsOneWidget);
    expect(find.text('Hoje'), findsOneWidget);
    expect(find.text('Aguardando sync'), findsOneWidget);
    expect(find.text('Hospital Norte'), findsOneWidget);
    expect(find.text('3 equipamentos'), findsOneWidget);
    expect(find.text('Split Hi-Wall 24.000 BTUs'), findsOneWidget);
    expect(find.byKey(const Key('syncNowButton')), findsOneWidget);
  });

  testWidgets('primeiro acesso exige dados, foto e assinatura do tecnico', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: FirstAccessScreen(
          loginGateway: const _GatewayComFalha(),
          onboardingToken: 'token-onboarding',
          technicianName: 'Joao Tecnico',
        ),
      ),
    );

    expect(find.byKey(const Key('firstAccessNameField')), findsOneWidget);
    expect(find.byKey(const Key('firstAccessCpfField')), findsOneWidget);
    expect(find.byKey(const Key('firstAccessPhoneField')), findsOneWidget);
    expect(find.byKey(const Key('firstAccessPhotoButton')), findsOneWidget);
    expect(find.byKey(const Key('firstAccessSignaturePad')), findsOneWidget);
  });

  testWidgets('primeiro cadastro abre sem excecao', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: LoginScreen(loginGateway: _GatewayConviteValido()),
      ),
    );

    await tester.tap(find.byKey(const Key('firstRegistrationButton')));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('technicianInviteCodeField')),
      'ABCD-EFGH',
    );
    await tester.tap(find.byKey(const Key('validateTechnicianInviteButton')));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.byKey(const Key('firstAccessNameField')), findsOneWidget);
    expect(find.byKey(const Key('firstAccessLoginField')), findsOneWidget);
  });

  testWidgets('primeiro acesso formata CPF e telefone', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: FirstAccessScreen(
          loginGateway: _GatewayComFalha(),
          onboardingToken: 'token-onboarding',
          technicianName: 'Joao Tecnico',
        ),
      ),
    );

    await tester.enterText(
      find.byKey(const Key('firstAccessCpfField')),
      '73070459900',
    );
    await tester.enterText(
      find.byKey(const Key('firstAccessPhoneField')),
      '43984451266',
    );

    final cpfField = tester.widget<TextField>(
      find.byKey(const Key('firstAccessCpfField')),
    );
    final phoneField = tester.widget<TextField>(
      find.byKey(const Key('firstAccessPhoneField')),
    );
    expect(cpfField.controller?.text, '730.704.599-00');
    expect(phoneField.controller?.text, '(43) 98445-1266');
  });

  testWidgets(
    'primeiro acesso informa CPF e telefone invalidos separadamente',
    (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: FirstAccessScreen(
            loginGateway: _GatewayComFalha(),
            onboardingToken: 'token-onboarding',
            technicianName: 'Joao Tecnico',
          ),
        ),
      );

      await tester.enterText(
        find.byKey(const Key('firstAccessCpfField')),
        '7307045990',
      );
      await tester.enterText(
        find.byKey(const Key('firstAccessPhoneField')),
        '43984451266',
      );
      await tester.ensureVisible(
        find.byKey(const Key('firstAccessSubmitButton')),
      );
      await tester.tap(find.byKey(const Key('firstAccessSubmitButton')));
      await tester.pump();
      expect(find.text('Informe um CPF com 11 dígitos.'), findsOneWidget);

      await tester.enterText(
        find.byKey(const Key('firstAccessCpfField')),
        '73070459900',
      );
      await tester.enterText(
        find.byKey(const Key('firstAccessPhoneField')),
        '439844512',
      );
      await tester.tap(find.byKey(const Key('firstAccessSubmitButton')));
      await tester.pump();
      expect(find.text('Informe um telefone com DDD.'), findsOneWidget);
    },
  );

  testWidgets('filtro pendentes mostra somente OS pendente', (tester) async {
    await tester.pumpWidget(const AirmovebrApp(demoMode: true));

    await tester.enterText(find.byKey(const Key('loginUserField')), 'teste');
    await tester.enterText(
      find.byKey(const Key('loginPasswordField')),
      '123456',
    );
    await tester.tap(find.byKey(const Key('loginSubmitButton')));
    await tester.pumpAndSettle();

    await _openMaintenance(tester);

    await tester.tap(find.byKey(const Key('filterPendingButton')));
    await tester.pumpAndSettle();

    expect(find.text('Hospital Norte'), findsOneWidget);
    expect(find.text('Clínica Centro'), findsNothing);
  });

  testWidgets('toque no card abre detalhe da OS', (tester) async {
    await tester.pumpWidget(const AirmovebrApp(demoMode: true));

    await tester.enterText(find.byKey(const Key('loginUserField')), 'teste');
    await tester.enterText(
      find.byKey(const Key('loginPasswordField')),
      '123456',
    );
    await tester.tap(find.byKey(const Key('loginSubmitButton')));
    await tester.pumpAndSettle();

    await _openMaintenance(tester);

    await tester.tap(find.text('Hospital Norte'));
    await tester.pumpAndSettle();

    expect(find.text('Detalhes da OS'), findsOneWidget);
    expect(find.text('OS-1042'), findsNothing);
    expect(find.byKey(const Key('workOrderHeaderCard')), findsOneWidget);
    expect(find.text('Equipamentos deste atendimento'), findsOneWidget);
    expect(find.text('Evaporadora sala 101'), findsOneWidget);
    expect(find.text('Evaporadora sala 102'), findsOneWidget);
    expect(find.text('Condensadora cobertura'), findsOneWidget);

    expect(find.text('Checklist previsto'), findsNothing);
    expect(find.text('Obrigatorios da execucao'), findsNothing);
    expect(find.text('GPS inicial'), findsNothing);
    expect(find.text('Foto depois'), findsNothing);
    expect(find.text('Nome e assinatura do cliente'), findsNothing);

    await tester.scrollUntilVisible(find.text('Iniciar atendimento'), 240);

    expect(find.text('Iniciar atendimento'), findsOneWidget);
  });

  testWidgets('login invalido mostra mensagem de erro', (tester) async {
    await tester.pumpWidget(const AirmovebrApp(demoMode: true));

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

  testWidgets('falha de rede no login libera botao e mostra erro', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(home: LoginScreen(loginGateway: _GatewayComFalha())),
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

    expect(find.text('Entrar'), findsOneWidget);
    expect(find.text('Falha ao conectar na API.'), findsOneWidget);
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

    await _openMaintenance(tester);

    expect(find.text('Cliente API'), findsOneWidget);
  });

  testWidgets('dashboard mostra OS atribuida mesmo fora do filtro hoje', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _GatewayDeTeste(
            repository: _RepositorioDeTeste(
              scheduledAt: DateTime.now().add(const Duration(days: 3)),
            ),
          ),
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

    await _openMaintenance(tester);

    expect(find.byKey(const Key('filterAllButton')), findsOneWidget);
    expect(find.text('Cliente API'), findsOneWidget);
  });

  testWidgets('botao iniciar atendimento muda OS e libera maquinas', (
    tester,
  ) async {
    final repository = _RepositorioDeTeste();
    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _GatewayDeTeste(repository: repository),
          locationService: const _LocationServiceTeste(),
          photoPicker: const _PhotoPickerTeste(),
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

    await _openMaintenance(tester);
    await tester.tap(find.text('Cliente API'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Iniciar atendimento'), 240);
    await _confirmSafetyAndStart(tester);

    expect(repository.startedOrderId, 'OS-API');
    await tester.scrollUntilVisible(
      find.text('Selecionar maquina'),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Selecionar maquina'), findsOneWidget);
  });

  testWidgets('iniciar atendimento libera selecao de maquina', (tester) async {
    final repository = _RepositorioDeTeste();
    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _GatewayDeTeste(repository: repository),
          locationService: const _LocationServiceTeste(),
          photoPicker: const _PhotoPickerTeste(),
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

    await _openMaintenance(tester);
    await tester.tap(find.text('Cliente API'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Iniciar atendimento'), 240);
    await _confirmSafetyAndStart(tester);

    expect(find.text('Selecionar maquina'), findsOneWidget);
    expect(find.byKey(const Key('machineSearchField')), findsOneWidget);
    expect(find.byKey(const Key('scanEquipmentInlineButton')), findsOneWidget);
    expect(find.text('Ler QR / codigo de barras'), findsNothing);
    expect(find.byKey(const Key('selectEquipment_EQ-101')), findsOneWidget);
    expect(find.byKey(const Key('selectEquipment_EQ-102')), findsOneWidget);

    final machineSearchField = find
        .byKey(const Key('machineSearchField'))
        .first;
    await tester.enterText(machineSearchField, 'sala 102');
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('selectEquipment_EQ-101')), findsNothing);
    expect(find.byKey(const Key('selectEquipment_EQ-102')), findsOneWidget);

    await tester.scrollUntilVisible(
      find.byKey(const Key('selectEquipment_EQ-102')),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('selectEquipment_EQ-102')));
    await tester.pumpAndSettle();

    expect(find.text('Maquina selecionada'), findsOneWidget);
    await tester.drag(find.byType(ListView), const Offset(0, -500));
    await tester.pumpAndSettle();
    expect(find.text('Selecione uma maquina'), findsNothing);
    expect(find.text('Iniciar checklist'), findsOneWidget);

    await tester.tap(find.text('Iniciar checklist'));
    await tester.pumpAndSettle();

    expect(find.text('Checklist da maquina'), findsOneWidget);
    expect(find.byKey(const Key('checklistProgressSummary')), findsOneWidget);
    expect(find.text('0/5 preenchidos'), findsOneWidget);
    expect(find.text('Seguranca', skipOffstage: false), findsOneWidget);
    expect(find.text('Fotos', skipOffstage: false), findsOneWidget);
    expect(find.text('Filtro e limpeza', skipOffstage: false), findsOneWidget);
    expect(find.text('Medicoes', skipOffstage: false), findsOneWidget);
    expect(find.text('Desligar pelo controle remoto'), findsOneWidget);
    expect(find.byKey(const Key('checklist_choice_M1_Sim')), findsOneWidget);
    expect(find.byKey(const Key('checklist_choice_M1_N/A')), findsNothing);
    expect(find.text('Condicao dos filtros'), findsOneWidget);
    expect(find.byKey(const Key('checklist_select_M6')), findsOneWidget);

    await tester.ensureVisible(find.byKey(const Key('checklist_number_S6')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('checklist_number_S6')), findsOneWidget);
    expect(find.byKey(const Key('checklist_text_S7')), findsOneWidget);
    expect(find.text('Foto apos abrir tampa frontal'), findsOneWidget);
    expect(find.byKey(const Key('checklist_photo_M4')), findsOneWidget);
    expect(find.byKey(const Key('checklist_final_M16')), findsOneWidget);
  });

  testWidgets('OS corretiva mostra fluxo corretivo no app', (tester) async {
    final repository = _RepositorioDeTeste(
      status: WorkOrderStatus.inProgress,
      backendStatus: 'em_atendimento',
      serviceType: 'corretiva',
    );
    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _GatewayDeTeste(repository: repository),
          locationService: const _LocationServiceTeste(),
          photoPicker: const _PhotoPickerTeste(),
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

    await _openMaintenance(tester);

    expect(find.text('Corretiva'), findsOneWidget);

    await tester.tap(find.text('Cliente API'));
    await tester.pumpAndSettle();

    expect(find.text('Tipo de servico'), findsOneWidget);
    expect(find.text('Corretiva'), findsWidgets);

    await tester.tap(find.text('Maquinas'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('selectEquipment_EQ-101')));
    await tester.pumpAndSettle();
    await tester.drag(find.byType(ListView), const Offset(0, -500));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Iniciar checklist'));
    await tester.pumpAndSettle();

    expect(find.text('Checklist corretivo'), findsOneWidget);
    expect(find.text('Problema encontrado'), findsOneWidget);
    expect(find.text('Acao realizada'), findsOneWidget);
    expect(find.text('Desligar pelo controle remoto'), findsNothing);
  });

  testWidgets('ler QR seleciona maquina correspondente', (tester) async {
    final repository = _RepositorioDeTeste();
    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _GatewayDeTeste(repository: repository),
          locationService: const _LocationServiceTeste(),
          photoPicker: const _PhotoPickerTeste(),
          barcodeScanner: const _BarcodeScannerTeste('QR-102'),
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
    await _openMaintenance(tester);
    await tester.tap(find.text('Cliente API'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Iniciar atendimento'), 240);
    await _confirmSafetyAndStart(tester);

    await tester.tap(find.byKey(const Key('scanEquipmentButton')));
    await tester.pumpAndSettle();

    expect(find.text('Maquina selecionada'), findsOneWidget);
    expect(find.text('Sala 102'), findsOneWidget);
  });

  testWidgets('salvar checklist envia respostas da maquina selecionada', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(900, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final repository = _RepositorioDeTeste();
    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _GatewayDeTeste(repository: repository),
          locationService: const _LocationServiceTeste(),
          photoPicker: const _PhotoPickerTeste(),
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

    await _openMaintenance(tester);
    await tester.tap(find.text('Cliente API'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Iniciar atendimento'), 240);
    await _confirmSafetyAndStart(tester);

    await tester.enterText(
      find.byKey(const Key('machineSearchField')),
      'sala 102',
    );
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const Key('selectEquipment_EQ-102')));
    await tester.tap(find.byKey(const Key('selectEquipment_EQ-102')));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.byKey(const Key('checklistReadyButton')),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.byKey(const Key('checklistReadyButton')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('checklist_choice_M1_Sim')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('checklist_select_M6')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('danificado').last);
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const Key('checklist_number_S6')));
    await tester.enterText(find.byKey(const Key('checklist_number_S6')), '7.5');
    await tester.enterText(
      find.byKey(const Key('checklist_text_S7')),
      'R-410A',
    );
    await tester.ensureVisible(find.byKey(const Key('checklist_photo_M4')));
    await tester.tap(find.byKey(const Key('checklist_photo_M4')));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const Key('saveChecklistButton')));
    await tester.tap(find.byKey(const Key('saveChecklistButton')));
    await tester.pumpAndSettle();

    expect(repository.savedChecklistEquipmentId, 'EQ-102');
    expect(repository.savedChecklistType, 'semestral');
    expect(repository.savedChecklistResponses['M1'], 'Sim');
    expect(repository.savedChecklistResponses['M6'], 'danificado');
    expect(repository.savedChecklistResponses['S6'], '7.5');
    expect(repository.savedChecklistResponses['S7'], 'R-410A');
    expect(find.text('Maquina concluida. Faltam 1.'), findsOneWidget);
  });

  testWidgets('item foto envia upload e salva URL no checklist', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(900, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final repository = _RepositorioDeTeste();
    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _GatewayDeTeste(repository: repository),
          locationService: const _LocationServiceTeste(),
          photoPicker: const _PhotoPickerTeste(),
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

    await _openMaintenance(tester);
    await tester.tap(find.text('Cliente API'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Iniciar atendimento'), 240);
    await _confirmSafetyAndStart(tester);

    await tester.enterText(
      find.byKey(const Key('machineSearchField')),
      'sala 102',
    );
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const Key('selectEquipment_EQ-102')));
    await tester.tap(find.byKey(const Key('selectEquipment_EQ-102')));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.byKey(const Key('checklistReadyButton')),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.byKey(const Key('checklistReadyButton')));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.byKey(const Key('checklist_photo_M4')));
    await tester.tap(find.byKey(const Key('checklist_photo_M4')));
    await tester.pumpAndSettle();

    expect(repository.uploadedPhotoCode, 'M4');
    expect(repository.uploadedPhotoEquipmentId, 'EQ-102');
    expect(repository.initialEvidenceOrderId, 'OS-API');
    expect(find.text('Foto registrada'), findsOneWidget);

    await tester.tap(find.byKey(const Key('checklist_choice_M1_Sim')));
    await tester.tap(find.byKey(const Key('checklist_select_M6')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('ok').last);
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const Key('checklist_number_S6')));
    await tester.enterText(find.byKey(const Key('checklist_number_S6')), '8');
    await tester.enterText(
      find.byKey(const Key('checklist_text_S7')),
      'R-410A',
    );
    await tester.ensureVisible(find.byKey(const Key('saveChecklistButton')));
    final saveChecklistButton = tester.widget<FilledButton>(
      find.byKey(const Key('saveChecklistButton')),
    );
    expect(saveChecklistButton.onPressed, isNotNull);
    await tester.tap(find.byKey(const Key('saveChecklistButton')));
    await tester.pumpAndSettle();

    expect(
      repository.savedChecklistResponses['M4'],
      '/storage/os/OS-API/checklist/EQ-102/M4.jpg',
    );
  });

  testWidgets('falha na foto do checklist mostra motivo da API', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(900, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final repository = _RepositorioDeTeste()
      ..checklistPhotoError = const HttpException(
        'Foto excede o limite de 3 MB.',
      );
    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _GatewayDeTeste(repository: repository),
          locationService: const _LocationServiceTeste(),
          photoPicker: const _PhotoPickerTeste(),
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

    await _openMaintenance(tester);
    await tester.tap(find.text('Cliente API'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Iniciar atendimento'), 240);
    await _confirmSafetyAndStart(tester);
    await tester.enterText(
      find.byKey(const Key('machineSearchField')),
      'sala 102',
    );
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const Key('selectEquipment_EQ-102')));
    await tester.tap(find.byKey(const Key('selectEquipment_EQ-102')));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.byKey(const Key('checklistReadyButton')),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.byKey(const Key('checklistReadyButton')));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.byKey(const Key('checklist_photo_M4')));
    await tester.tap(find.byKey(const Key('checklist_photo_M4')));
    await tester.pumpAndSettle();

    expect(find.text('Foto excede o limite de 3 MB.'), findsOneWidget);
    expect(find.text('Falha ao enviar foto do checklist.'), findsNothing);
  });

  testWidgets('detalhe em atendimento usa abas menores para o fluxo', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(900, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final repository = _RepositorioDeTeste();
    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _GatewayDeTeste(repository: repository),
          locationService: const _LocationServiceTeste(),
          photoPicker: const _PhotoPickerTeste(),
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
    await _openMaintenance(tester);
    await tester.tap(find.text('Cliente API'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Iniciar atendimento'), 240);
    await _confirmSafetyAndStart(tester);

    expect(
      find.byKey(const Key('stepTab_data'), skipOffstage: false),
      findsOneWidget,
    );
    expect(
      find.byKey(const Key('stepTab_machines'), skipOffstage: false),
      findsOneWidget,
    );
    expect(
      find.byKey(const Key('stepTab_checklist'), skipOffstage: false),
      findsOneWidget,
    );
    expect(
      find.byKey(const Key('stepTab_finish'), skipOffstage: false),
      findsOneWidget,
    );
    expect(find.text('Selecionar maquina'), findsOneWidget);
    expect(find.text('Finalizar OS'), findsNothing);

    await tester.ensureVisible(
      find.byKey(const Key('stepTab_finish'), skipOffstage: false),
    );
    await tester.tap(find.byKey(const Key('stepTab_finish')));
    await tester.pumpAndSettle();

    expect(find.text('Finalizar OS'), findsOneWidget);
    expect(find.text('Selecionar maquina'), findsNothing);
  });

  testWidgets(
    'checklist de camara fria exige foto da evaporadora condensadora e controlador',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(900, 1600));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final repository = _RepositorioDeTeste(
        status: WorkOrderStatus.inProgress,
        backendStatus: 'em_atendimento',
        checklistType: 'mensal',
        equipments: _singleEquipment,
        checklist: const [
          WorkOrderChecklistItem(
            code: 'CFM_FOTO_CONTROLADOR',
            label: 'Foto do controlador com temperatura',
            kind: 'foto',
            stage: 'evaporadora',
          ),
          WorkOrderChecklistItem(
            code: 'CFM_FOTO_EVAP',
            label: 'Foto da evaporadora',
            kind: 'foto',
            stage: 'evaporadora',
          ),
          WorkOrderChecklistItem(
            code: 'CFM_FOTO_COND',
            label: 'Foto da condensadora',
            kind: 'foto',
            stage: 'condensadora',
          ),
        ],
      );
      await tester.pumpWidget(
        MaterialApp(
          home: LoginScreen(
            loginGateway: _GatewayDeTeste(repository: repository),
            locationService: const _LocationServiceTeste(),
            photoPicker: const _PhotoPickerTeste(),
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
      await _openMaintenance(tester);
      await tester.tap(find.text('Cliente API'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('stepTab_machines')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('selectEquipment_EQ-102')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('checklistReadyButton')));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('saveChecklistButton')));
      await tester.pumpAndSettle();
      expect(
        find.text('Preencha: Foto do controlador com temperatura.'),
        findsOneWidget,
      );

      for (final code in [
        'CFM_FOTO_CONTROLADOR',
        'CFM_FOTO_EVAP',
        'CFM_FOTO_COND',
      ]) {
        await tester.ensureVisible(find.byKey(Key('checklist_photo_$code')));
        await tester.tap(find.byKey(Key('checklist_photo_$code')));
        await tester.pumpAndSettle();
      }

      await tester.tap(find.byKey(const Key('saveChecklistButton')));
      await tester.pumpAndSettle();

      expect(repository.savedChecklistResponses, {
        'CFM_FOTO_CONTROLADOR':
            '/storage/os/OS-API/checklist/EQ-102/CFM_FOTO_CONTROLADOR.jpg',
        'CFM_FOTO_EVAP':
            '/storage/os/OS-API/checklist/EQ-102/CFM_FOTO_EVAP.jpg',
        'CFM_FOTO_COND':
            '/storage/os/OS-API/checklist/EQ-102/CFM_FOTO_COND.jpg',
      });
    },
  );

  testWidgets('salvar checklist vazio mostra item obrigatorio faltando', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(900, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final repository = _RepositorioDeTeste();
    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _GatewayDeTeste(repository: repository),
          locationService: const _LocationServiceTeste(),
          photoPicker: const _PhotoPickerTeste(),
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
    await _openMaintenance(tester);
    await tester.tap(find.text('Cliente API'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Iniciar atendimento'), 240);
    await _confirmSafetyAndStart(tester);
    await tester.enterText(
      find.byKey(const Key('machineSearchField')),
      'sala 102',
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('selectEquipment_EQ-102')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('checklistReadyButton')));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const Key('checklist_photo_M4')));
    await tester.tap(find.byKey(const Key('checklist_photo_M4')));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const Key('saveChecklistButton')));
    await tester.tap(find.byKey(const Key('saveChecklistButton')));
    await tester.pumpAndSettle();

    expect(
      find.text('Preencha: Desligar pelo controle remoto.'),
      findsOneWidget,
    );
    expect(repository.savedChecklistResponses, isEmpty);
  });

  testWidgets('dados obrigatorios faltando ficam destacados em azul claro', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(900, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final repository = _RepositorioDeTeste(
      status: WorkOrderStatus.inProgress,
      backendStatus: 'em_atendimento',
      equipments: const [
        WorkOrderEquipment(
          id: 'EQ-INCOMPLETA',
          name: 'Evaporadora quarto',
          location: 'Quarto',
          model: '',
        ),
      ],
    );
    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _GatewayDeTeste(repository: repository),
          locationService: const _LocationServiceTeste(),
          photoPicker: const _PhotoPickerTeste(),
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
    await _openMaintenance(tester);
    await tester.tap(find.text('Cliente API'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('stepTab_machines')));
    await tester.pumpAndSettle();

    expect(find.text('Com dados faltando'), findsOneWidget);
    expect(find.text('7 pendencias'), findsWidgets);
    await tester.tap(find.byKey(const Key('selectEquipment_EQ-INCOMPLETA')));
    await tester.pumpAndSettle();

    expect(find.text('Falta preencher'), findsWidgets);
    expect(find.text('Modelo'), findsWidgets);
    expect(find.text('Tipo'), findsWidgets);
    tester
        .widget<FilledButton>(find.byKey(const Key('saveMachineButton')))
        .onPressed
        ?.call();
    await tester.pumpAndSettle();

    expect(find.text('Preencha: QR / codigo da maquina.'), findsOneWidget);
    final missingField = tester.widget<TextField>(
      find.byKey(const Key('machineField_modelo')),
    );
    expect(missingField.decoration?.fillColor, airmovebrRequiredMissingFill);
    expect(find.text('Falta preencher'), findsWidgets);
  });

  testWidgets('campos simples do checklist usam avancar no teclado', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(900, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final repository = _RepositorioDeTeste();
    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _GatewayDeTeste(repository: repository),
          locationService: const _LocationServiceTeste(),
          photoPicker: const _PhotoPickerTeste(),
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
    await _openMaintenance(tester);
    await tester.tap(find.text('Cliente API'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Iniciar atendimento'), 240);
    await _confirmSafetyAndStart(tester);
    await tester.tap(find.byKey(const Key('selectEquipment_EQ-102')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('checklistReadyButton')));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.byKey(const Key('checklist_number_S6')));
    await tester.pumpAndSettle();

    final numberField = tester.widget<TextField>(
      find.byKey(const Key('checklist_number_S6')),
    );
    final textField = tester.widget<TextField>(
      find.byKey(const Key('checklist_text_S7')),
    );

    expect(numberField.textInputAction, TextInputAction.next);
    expect(textField.textInputAction, TextInputAction.next);
    expect(textField.maxLines, 1);
  });

  testWidgets(
    'finalizacao libera foto final nome e assinatura apos foto do checklist',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(900, 1600));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final repository = _RepositorioDeTeste();
      await tester.pumpWidget(
        MaterialApp(
          home: LoginScreen(
            loginGateway: _GatewayDeTeste(repository: repository),
            locationService: const _LocationServiceTeste(),
            photoPicker: const _PhotoPickerTeste(),
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
      await _openMaintenance(tester);
      await tester.tap(find.text('Cliente API'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Iniciar atendimento'), 240);
      await _confirmSafetyAndStart(tester);
      await tester.enterText(
        find.byKey(const Key('machineSearchField')),
        'sala 102',
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('selectEquipment_EQ-102')));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.byKey(const Key('checklistReadyButton')),
        240,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.byKey(const Key('checklistReadyButton')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('initialEvidenceButton')), findsNothing);
      await tester.ensureVisible(find.byKey(const Key('checklist_photo_M4')));
      await tester.tap(find.byKey(const Key('checklist_photo_M4')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('stepTab_finish')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('finalEvidenceButton')), findsNothing);
      await tester.ensureVisible(find.byKey(const Key('responsibleNameField')));
      await tester.enterText(
        find.byKey(const Key('responsibleNameField')),
        'Cliente Teste',
      );
      await _signPad(tester, const Key('signaturePad'));
      final finishButton = tester.widget<FilledButton>(
        find.byKey(const Key('finishWorkOrderButton')),
      );

      expect(repository.finalEvidenceOrderId, isNull);
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('responsibleNameField')))
            .controller
            ?.text,
        'Cliente Teste',
      );
      expect(finishButton.onPressed, isNull);
      expect(find.text('Finalize todos os equipamentos'), findsOneWidget);
    },
  );

  testWidgets('finalizacao coleta evidencias assinatura e conclui OS', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(900, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final repository = _RepositorioDeTeste(equipments: _singleEquipment)
      ..pendingSyncCountValue = 1
      ..syncResult = const OfflineSyncResult(synced: 1);
    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _GatewayDeTeste(repository: repository),
          locationService: const _LocationServiceTeste(),
          photoPicker: const _PhotoPickerTeste(),
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

    await _openMaintenance(tester);
    await tester.tap(find.text('Cliente API'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Iniciar atendimento'), 240);
    await _confirmSafetyAndStart(tester);
    await tester.enterText(
      find.byKey(const Key('machineSearchField')),
      'sala 102',
    );
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const Key('selectEquipment_EQ-102')));
    await tester.tap(find.byKey(const Key('selectEquipment_EQ-102')));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.byKey(const Key('checklistReadyButton')),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.byKey(const Key('checklistReadyButton')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('checklist_choice_M1_Sim')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('checklist_select_M6')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('ok').last);
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const Key('checklist_number_S6')));
    await tester.enterText(find.byKey(const Key('checklist_number_S6')), '8');
    await tester.enterText(
      find.byKey(const Key('checklist_text_S7')),
      'R-410A',
    );
    await tester.ensureVisible(find.byKey(const Key('checklist_photo_M4')));
    await tester.tap(find.byKey(const Key('checklist_photo_M4')));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const Key('saveChecklistButton')));
    await tester.tap(find.byKey(const Key('saveChecklistButton')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('finalEvidenceButton')), findsNothing);
    await tester.ensureVisible(find.byKey(const Key('responsibleNameField')));
    await tester.enterText(
      find.byKey(const Key('responsibleNameField')),
      'Cliente Teste',
    );
    await _signPad(tester, const Key('signaturePad'));
    await tester.ensureVisible(find.byKey(const Key('finishWorkOrderButton')));
    final finishButton = tester.widget<FilledButton>(
      find.byKey(const Key('finishWorkOrderButton')),
    );
    expect(finishButton.onPressed, isNotNull);
    await tester.runAsync(() async {
      finishButton.onPressed!();
      await Future<void>.delayed(const Duration(seconds: 2));
    });
    await tester.pumpAndSettle();
    expect(
      find.text('Informe o responsavel e colete a assinatura.'),
      findsNothing,
    );
    expect(
      find.text('Registre a foto depois antes de finalizar.'),
      findsNothing,
    );
    expect(find.text('Falha ao finalizar OS.'), findsNothing);

    expect(repository.initialEvidenceOrderId, 'OS-API');
    expect(repository.finalEvidenceOrderId, isNull);
    expect(repository.syncPendingCalls, 1);
    expect(repository.finishedOrderId, 'OS-API');
    expect(repository.finishInput?.responsibleName, 'Cliente Teste');
    expect(
      repository.finishInput?.signatureBase64,
      startsWith('data:image/png;base64,'),
    );
    expect(repository.finishInput?.latitude, -23.3048);
    expect(repository.finishInput?.longitude, -51.1701);
    expect(find.text('Detalhes da OS'), findsNothing);
    expect(find.byKey(const Key('myMaintenanceButton')), findsOneWidget);
    expect(find.text('Ordens de servico'), findsOneWidget);
    expect(find.text('OS finalizada.'), findsOneWidget);
  });

  testWidgets('assinatura abre fora do scroll e confirma pontos', (
    tester,
  ) async {
    final capturedPoints = <Offset?>[];

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) {
              return SignaturePadField(
                signatureKey: const Key('signaturePad'),
                points: capturedPoints,
                enabled: true,
                onChanged: (points) {
                  setState(() {
                    capturedPoints
                      ..clear()
                      ..addAll(points);
                  });
                },
              );
            },
          ),
        ),
      ),
    );

    await tester.tap(find.byKey(const Key('signaturePad')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('signaturePadCanvas')), findsOneWidget);

    final gesture = await tester.startGesture(
      tester.getCenter(find.byKey(const Key('signaturePadCanvas'))),
    );
    await gesture.moveBy(const Offset(80, 30));
    await gesture.up();
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('confirmSignatureButton')));
    await tester.pumpAndSettle();

    expect(capturedPoints.whereType<Offset>(), isNotEmpty);
    expect(find.text('Refazer assinatura'), findsOneWidget);
  });

  testWidgets('finalizacao offline entra na fila mesmo com checklist pendente', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(900, 1200));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final repository =
        _RepositorioDeTeste(
            equipments: const [
              WorkOrderEquipment(
                id: 'EQ-102',
                qrCode: 'QR-102',
                type: 'Split',
                brand: 'Samsung',
                name: 'Evaporadora sala 102',
                location: 'Sala 102',
                model: 'Split API',
                btus: 24000,
                gas: 'R-410A',
                serialNumber: 'SN-102',
                executionStatus: 'aguardando_sync',
              ),
            ],
            status: WorkOrderStatus.inProgress,
            backendStatus: 'em_atendimento',
          )
          ..pendingSyncCountValue = 1
          ..syncResult = const OfflineSyncResult(failed: 1)
          ..finishWaitingSync = true;
    final order = (await repository.listMine()).single;

    await tester.pumpWidget(
      MaterialApp(
        home: WorkOrderDetailScreen(
          order: order,
          repository: repository,
          locationService: const _LocationServiceTeste(),
          photoPicker: const _PhotoPickerTeste(),
          barcodeScanner: const _BarcodeScannerTeste(null),
          technicianName: 'Joao Tecnico',
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.byKey(const Key('responsibleNameField')));
    await tester.enterText(
      find.byKey(const Key('responsibleNameField')),
      'Cliente Teste',
    );
    await _signPad(tester, const Key('signaturePad'));
    await tester.ensureVisible(find.byKey(const Key('finishWorkOrderButton')));
    final finishButton = tester.widget<FilledButton>(
      find.byKey(const Key('finishWorkOrderButton')),
    );
    expect(finishButton.onPressed, isNotNull);
    await tester.runAsync(() async {
      finishButton.onPressed!();
      await Future<void>.delayed(const Duration(seconds: 2));
    });
    await tester.pumpAndSettle();

    expect(repository.syncPendingCalls, 1);
    expect(repository.finishedOrderId, 'OS-API');
    expect(
      find.text(
        'Ainda ha dados pendentes de sincronizacao. Sincronize antes de finalizar.',
      ),
      findsNothing,
    );
    expect(
      repository.finishInput?.technicianSignatureBase64,
      startsWith('data:image/png;base64,'),
    );
  });

  testWidgets('falha ao finalizar OS mostra motivo visivel ao tecnico', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(900, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final repository = _RepositorioDeTeste(equipments: _singleEquipment)
      ..finishError = const HttpException('Checklist obrigatorio');
    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _GatewayDeTeste(repository: repository),
          locationService: const _LocationServiceTeste(),
          photoPicker: const _PhotoPickerTeste(),
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

    await _openMaintenance(tester);
    await tester.tap(find.text('Cliente API'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Iniciar atendimento'), 240);
    await _confirmSafetyAndStart(tester);
    await tester.enterText(
      find.byKey(const Key('machineSearchField')),
      'sala 102',
    );
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const Key('selectEquipment_EQ-102')));
    await tester.tap(find.byKey(const Key('selectEquipment_EQ-102')));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.byKey(const Key('checklistReadyButton')),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.byKey(const Key('checklistReadyButton')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('checklist_choice_M1_Sim')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('checklist_select_M6')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('ok').last);
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const Key('checklist_number_S6')));
    await tester.enterText(find.byKey(const Key('checklist_number_S6')), '8');
    await tester.enterText(
      find.byKey(const Key('checklist_text_S7')),
      'R-410A',
    );
    await tester.ensureVisible(find.byKey(const Key('checklist_photo_M4')));
    await tester.tap(find.byKey(const Key('checklist_photo_M4')));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const Key('saveChecklistButton')));
    await tester.tap(find.byKey(const Key('saveChecklistButton')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('finalEvidenceButton')), findsNothing);
    await tester.ensureVisible(find.byKey(const Key('responsibleNameField')));
    await tester.enterText(
      find.byKey(const Key('responsibleNameField')),
      'Cliente Teste',
    );
    await _signPad(tester, const Key('signaturePad'));
    await tester.ensureVisible(find.byKey(const Key('finishWorkOrderButton')));
    final finishButton = tester.widget<FilledButton>(
      find.byKey(const Key('finishWorkOrderButton')),
    );

    await tester.runAsync(() async {
      finishButton.onPressed!();
      await Future<void>.delayed(const Duration(seconds: 2));
    });
    await tester.pump();

    expect(find.byType(SnackBar), findsOneWidget);
    expect(find.textContaining('Checklist obrigatorio'), findsWidgets);
    expect(find.text('OS finalizada.'), findsNothing);
  });

  testWidgets('OS ja concluida no app libera finalizacao ao reabrir detalhe', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(900, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final repository = _RepositorioDeTeste(
      status: WorkOrderStatus.inProgress,
      backendStatus: 'em_atendimento',
      equipments: const [
        WorkOrderEquipment(
          id: 'EQ-102',
          qrCode: 'QR-102',
          type: 'Split',
          brand: 'Samsung',
          name: 'Evaporadora sala 102',
          location: 'Sala 102',
          model: 'Split API',
          btus: 24000,
          gas: 'R-410A',
          serialNumber: 'SN-102',
          executionStatus: 'feito',
        ),
      ],
    );
    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _GatewayDeTeste(repository: repository),
          locationService: const _LocationServiceTeste(),
          photoPicker: const _PhotoPickerTeste(),
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
    await _openMaintenance(tester);
    await tester.tap(find.text('Cliente API'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('stepTab_finish')));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const Key('responsibleNameField')),
      'Teste Clima do Brasil',
    );
    await _signPad(tester, const Key('signaturePad'));

    final nameField = tester.widget<TextField>(
      find.byKey(const Key('responsibleNameField')),
    );
    final finishButton = tester.widget<FilledButton>(
      find.byKey(const Key('finishWorkOrderButton')),
    );

    expect(nameField.enabled, isTrue);
    expect(finishButton.onPressed, isNotNull);
    await tester.runAsync(() async {
      finishButton.onPressed!();
      await Future<void>.delayed(const Duration(seconds: 2));
    });
    await tester.pumpAndSettle();

    expect(repository.finishedOrderId, 'OS-API');
    expect(repository.finishInput?.responsibleName, 'Teste Clima do Brasil');
    expect(
      repository.finishInput?.signatureBase64,
      startsWith('data:image/png;base64,'),
    );
  });

  testWidgets('cadastro de maquina usa seletores e salva dados obrigatorios', (
    tester,
  ) async {
    final repository = _RepositorioDeTeste();
    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _GatewayDeTeste(repository: repository),
          locationService: const _LocationServiceTeste(),
          barcodeScanner: const _BarcodeScannerTeste('QR-999'),
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

    await _openMaintenance(tester);
    await tester.tap(find.text('Cliente API'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Iniciar atendimento'), 240);
    await _confirmSafetyAndStart(tester);
    await tester.scrollUntilVisible(
      find.byKey(const Key('newMachineButton')),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('newMachineButton')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('machineSelect_tipo')), findsOneWidget);
    expect(
      find.byKey(const Key('machineSelect_gas_refrigerante')),
      findsOneWidget,
    );
    expect(
      find.byKey(const Key('machineField_capacidade_btu')),
      findsOneWidget,
    );

    final qrField = tester.widget<TextField>(
      find.byKey(const Key('machineField_codigo_qr')),
    );
    expect(qrField.maxLength, 20);

    await tester.scrollUntilVisible(
      find.byKey(const Key('machineField_codigo_qr')),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('machineScan_codigo_qr')), findsOneWidget);
    await tester.tap(find.byKey(const Key('machineScan_codigo_qr')));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.byKey(const Key('machineSelect_tipo')),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('machineSelect_tipo')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cassete').last);
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.byKey(const Key('machineField_marca')),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.enterText(
      find.byKey(const Key('machineField_marca')),
      'Daikin',
    );
    await tester.enterText(
      find.byKey(const Key('machineField_modelo')),
      'SkyAir',
    );
    await tester.enterText(
      find.byKey(const Key('machineField_capacidade_btu')),
      '36000',
    );
    await tester.scrollUntilVisible(
      find.byKey(const Key('machineSelect_gas_refrigerante')),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('machineSelect_gas_refrigerante')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('R-410A').last);
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.byKey(const Key('machineField_numero_serie')),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.enterText(
      find.byKey(const Key('machineField_numero_serie')),
      'SN-999',
    );
    await tester.enterText(
      find.byKey(const Key('machineField_local_instalacao')),
      'Sala nova',
    );
    await tester.ensureVisible(find.byKey(const Key('saveMachineButton')));
    await tester.tap(find.byKey(const Key('saveMachineButton')));
    await tester.pumpAndSettle();

    expect(repository.savedMachineInput?.qrCode, 'QR-999');
    expect(repository.savedMachineInput?.type, 'Cassete');
    expect(repository.savedMachineInput?.brand, 'Daikin');
    expect(repository.savedMachineInput?.model, 'SkyAir');
    expect(repository.savedMachineInput?.btus, 36000);
    expect(repository.savedMachineInput?.gas, 'R-410A');
    expect(repository.savedMachineInput?.serialNumber, 'SN-999');
    expect(repository.savedMachineInput?.location, 'Sala nova');
    await tester.scrollUntilVisible(
      find.byKey(const Key('checklistReadyButton')),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    final checklistButton = tester.widget<FilledButton>(
      find.byKey(const Key('checklistReadyButton')),
    );
    expect(checklistButton.onPressed, isNotNull);
  });

  testWidgets('editar maquina aceita tipo cadastrado fora da lista padrao', (
    tester,
  ) async {
    final repository = _RepositorioDeTeste(
      status: WorkOrderStatus.inProgress,
      backendStatus: 'em_atendimento',
      equipments: const [
        WorkOrderEquipment(
          id: 'EQ-EXTERNO',
          qrCode: '10016',
          type: 'Quarto',
          brand: 'Kufr12',
          name: 'Quarto',
          location: 'Quarto',
          model: 'Kufr12',
          btus: 12000,
          serialNumber: 'SN-EXT',
        ),
      ],
    );
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

    await _openMaintenance(tester);
    await tester.tap(find.text('Cliente API'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('stepTab_machines')));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.byKey(const Key('selectEquipment_EQ-EXTERNO')),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.byKey(const Key('selectEquipment_EQ-EXTERNO')));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.byKey(const Key('machineSelect_tipo')),
      240,
      scrollable: find.byType(Scrollable).first,
    );

    expect(find.byKey(const Key('machineSelect_tipo')), findsOneWidget);
    expect(find.text('Quarto'), findsWidgets);
  });

  testWidgets('checklist anual salva rascunho e conclui as duas etapas', (
    tester,
  ) async {
    final repository = _RepositorioDeTeste(
      status: WorkOrderStatus.inProgress,
      backendStatus: 'em_atendimento',
      checklistType: 'anual',
      equipments: _singleEquipment,
      checklist: const [
        WorkOrderChecklistItem(
          code: 'ANU_EVAP_1',
          label: 'Evaporadora 1',
          kind: 'select_obs',
          options: ['Executado', 'Não executado'],
          stage: 'evaporadora',
        ),
        WorkOrderChecklistItem(
          code: 'ANU_EVAP_2',
          label: 'Evaporadora 2',
          kind: 'select_obs',
          options: ['Executado', 'Não executado'],
          stage: 'evaporadora',
        ),
        WorkOrderChecklistItem(
          code: 'ANU_COND_1',
          label: 'Condensadora 1',
          kind: 'select_obs',
          options: ['Executado', 'Não executado'],
          stage: 'condensadora',
        ),
        WorkOrderChecklistItem(
          code: 'ANU_COND_2',
          label: 'Condensadora 2',
          kind: 'select_obs',
          options: ['Executado', 'Não executado'],
          stage: 'condensadora',
        ),
      ],
    );
    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _GatewayDeTeste(repository: repository),
          locationService: const _LocationServiceTeste(),
        ),
      ),
    );

    await tester.enterText(find.byKey(const Key('loginUserField')), 'teste');
    await tester.enterText(
      find.byKey(const Key('loginPasswordField')),
      '123456',
    );
    await tester.tap(find.byKey(const Key('loginSubmitButton')));
    await tester.pumpAndSettle();
    await _openMaintenance(tester);
    await tester.tap(find.text('Cliente API'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('stepTab_machines')));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.byKey(const Key('selectEquipment_EQ-102')),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.ensureVisible(find.byKey(const Key('selectEquipment_EQ-102')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('selectEquipment_EQ-102')));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.byKey(const Key('checklistReadyButton')),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.byKey(const Key('checklistReadyButton')));
    await tester.pumpAndSettle();

    expect(
      find.byKey(const Key('checklist_choice_ANU_EVAP_1_Executado')),
      findsOneWidget,
    );
    expect(
      find.byKey(const Key('checklist_choice_ANU_COND_1_Executado')),
      findsNothing,
    );
    await tester.tap(
      find.byKey(const Key('checklist_choice_ANU_EVAP_1_Executado')),
    );
    await tester.tap(
      find.byKey(const Key('checklist_choice_ANU_EVAP_2_Executado')),
    );
    await tester.tap(find.byKey(const Key('saveAnnualDraftButton')));
    await tester.pumpAndSettle();
    expect(repository.savedChecklistResponses, {
      'ANU_EVAP_1': 'Executado',
      'ANU_EVAP_2': 'Executado',
    });

    await tester.tap(find.byKey(const Key('selectEquipment_EQ-102')));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.byKey(const Key('checklistReadyButton')),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.byKey(const Key('checklistReadyButton')));
    await tester.pumpAndSettle();
    expect(
      tester
          .widget<ChoiceChip>(
            find.byKey(const Key('checklist_choice_ANU_EVAP_1_Executado')),
          )
          .selected,
      isTrue,
    );

    await tester.tap(find.byKey(const Key('annualStage_condensadora')));
    await tester.pumpAndSettle();
    expect(
      find.byKey(const Key('checklist_choice_ANU_EVAP_1_Executado')),
      findsNothing,
    );
    expect(
      find.byKey(const Key('checklist_choice_ANU_COND_1_Executado')),
      findsOneWidget,
    );
    await tester.tap(
      find.byKey(const Key('checklist_choice_ANU_COND_1_Executado')),
    );
    await tester.tap(
      find.byKey(const Key('checklist_choice_ANU_COND_2_Executado')),
    );
    await tester.tap(find.byKey(const Key('completeAnnualStageButton')));
    await tester.pumpAndSettle();
    expect(find.text('Concluidas'), findsNothing);

    await tester.tap(find.byKey(const Key('selectEquipment_EQ-102')));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.byKey(const Key('checklistReadyButton')),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.byKey(const Key('checklistReadyButton')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('completeAnnualStageButton')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('finishWorkOrderButton')), findsOneWidget);
  });

  testWidgets(
    'checklist anual abre etapa pendente e bloqueia etapa concluida',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(900, 1600));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final repository = _RepositorioDeTeste(
        status: WorkOrderStatus.inProgress,
        backendStatus: 'em_atendimento',
        checklistType: 'anual',
        equipments: const [
          WorkOrderEquipment(
            id: 'EQ-102',
            qrCode: 'QR-102',
            type: 'Split',
            brand: 'Samsung',
            name: 'Sala 102',
            location: 'Sala 102',
            model: 'Split API',
            btus: 24000,
            gas: 'R-410A',
            serialNumber: 'SN-102',
            executionStatus: 'em_andamento',
            checklistResponses: [
              WorkOrderChecklistResponse(
                code: 'ANU_EVAP',
                kind: 'select_obs',
                value: 'Executado',
              ),
              WorkOrderChecklistResponse(
                code: 'ANU_ETAPA_EVAPORADORA_CONCLUIDA',
                kind: 'etapa',
                value: 'concluida',
              ),
            ],
          ),
        ],
        checklist: const [
          WorkOrderChecklistItem(
            code: 'ANU_EVAP',
            label: 'Evaporadora',
            kind: 'select_obs',
            options: ['Executado'],
            stage: 'evaporadora',
          ),
          WorkOrderChecklistItem(
            code: 'ANU_COND',
            label: 'Condensadora',
            kind: 'select_obs',
            options: ['Executado'],
            stage: 'condensadora',
          ),
        ],
      );
      await tester.pumpWidget(
        MaterialApp(
          home: LoginScreen(
            loginGateway: _GatewayDeTeste(repository: repository),
            locationService: const _LocationServiceTeste(),
          ),
        ),
      );
      await tester.enterText(find.byKey(const Key('loginUserField')), 'teste');
      await tester.enterText(
        find.byKey(const Key('loginPasswordField')),
        '123456',
      );
      await tester.tap(find.byKey(const Key('loginSubmitButton')));
      await tester.pumpAndSettle();
      await _openMaintenance(tester);
      await tester.tap(find.text('Cliente API'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('stepTab_machines')));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.byKey(const Key('selectEquipment_EQ-102')),
        240,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.byKey(const Key('selectEquipment_EQ-102')));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.byKey(const Key('checklistReadyButton')),
        240,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.byKey(const Key('checklistReadyButton')));
      await tester.pumpAndSettle();

      expect(
        tester
            .widget<ChoiceChip>(
              find.byKey(const Key('annualStage_condensadora')),
            )
            .selected,
        isTrue,
      );
      expect(
        find.byKey(const Key('annualStageCompleted_evaporadora')),
        findsOneWidget,
      );
      await tester.tap(find.byKey(const Key('annualStage_evaporadora')));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<OutlinedButton>(
              find.byKey(const Key('saveAnnualDraftButton')),
            )
            .onPressed,
        isNull,
      );
      expect(
        tester
            .widget<FilledButton>(
              find.byKey(const Key('completeAnnualStageButton')),
            )
            .onPressed,
        isNull,
      );
    },
  );

  testWidgets('dashboard registra abastecimento simples', (tester) async {
    final fleetRepository = FakeFleetRepository();

    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _GatewayDeTeste(
            repository: _RepositorioDeTeste(),
            fleetRepository: fleetRepository,
          ),
        ),
      ),
    );

    await tester.enterText(find.byKey(const Key('loginUserField')), 'teste');
    await tester.enterText(
      find.byKey(const Key('loginPasswordField')),
      '123456',
    );
    await tester.tap(find.byKey(const Key('loginSubmitButton')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('fuelingButton')));
    await tester.pumpAndSettle();

    expect(find.text('Abastecimento'), findsOneWidget);

    await tester.enterText(find.byKey(const Key('fuelOdometerField')), '51700');
    await tester.enterText(find.byKey(const Key('fuelLitersField')), '20,5');
    await tester.enterText(
      find.byKey(const Key('fuelTotalValueField')),
      '123,45',
    );
    await tester.tap(find.byKey(const Key('saveFuelingButton')));
    await tester.pumpAndSettle();

    expect(fleetRepository.fuelings, hasLength(1));
    expect(fleetRepository.fuelings.single.vehicleId, 'veiculo-1');
    expect(fleetRepository.fuelings.single.odometerKm, 51700);
    expect(fleetRepository.fuelings.single.liters, 20.5);
    expect(fleetRepository.fuelings.single.totalValue, 123.45);
    expect(find.text('Abastecimento salvo.'), findsOneWidget);
  });

  testWidgets('abastecimento nao estoura com nome de carro longo', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(360, 760));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _GatewayDeTeste(
            repository: _RepositorioDeTeste(),
            fleetRepository: _FleetRepositoryCarroLongo(),
          ),
        ),
      ),
    );

    await tester.enterText(find.byKey(const Key('loginUserField')), 'teste');
    await tester.enterText(
      find.byKey(const Key('loginPasswordField')),
      '123456',
    );
    await tester.tap(find.byKey(const Key('loginSubmitButton')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('fuelingButton')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('fuelVehicleSelect')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

Future<void> _openMaintenance(WidgetTester tester) async {
  await tester.tap(find.byKey(const Key('myMaintenanceButton')));
  await tester.pumpAndSettle();
}

Future<void> _confirmSafetyAndStart(WidgetTester tester) async {
  await tester.tap(find.text('Iniciar atendimento'));
  await tester.pumpAndSettle();
  for (final key in ['safety_epi', 'safety_power', 'safety_area']) {
    await tester.tap(find.byKey(Key(key)));
  }
  await tester.tap(find.byKey(const Key('safety_confirm')));
  await tester.pumpAndSettle();
}

Future<void> _signPad(WidgetTester tester, Key key) async {
  await tester.ensureVisible(find.byKey(key));
  await tester.tap(find.byKey(key));
  await tester.pumpAndSettle();
  final gesture = await tester.startGesture(
    tester.getCenter(find.byKey(const Key('signaturePadCanvas'))),
  );
  await gesture.moveBy(const Offset(80, 30));
  await gesture.up();
  await tester.pumpAndSettle();
  await tester.tap(find.byKey(const Key('confirmSignatureButton')));
  await tester.pumpAndSettle();
}

class _GatewayComFalha implements MobileLoginGateway {
  const _GatewayComFalha();

  @override
  Future<LoginSession?> login(String user, String password) async {
    throw const SocketException('API indisponivel');
  }

  @override
  Future<LoginSession?> refresh(String refreshToken) async {
    throw const SocketException('API indisponivel');
  }

  @override
  Future<LoginSession?> completeFirstAccess(
    FirstAccessRegistration registration,
  ) async {
    throw const SocketException('API indisponivel');
  }

  @override
  Future<bool> validateTechnicianInvite(String code) async =>
      throw const SocketException('API indisponivel');

  @override
  Future<LoginSession?> registerWithTechnicianInvite(
    TechnicianInviteRegistration registration,
  ) async {
    throw const SocketException('API indisponivel');
  }
}

class _GatewayConviteValido extends _GatewayComFalha {
  const _GatewayConviteValido();

  @override
  Future<bool> validateTechnicianInvite(String code) async => true;
}

class _GatewayDeTeste implements MobileLoginGateway {
  const _GatewayDeTeste({required this.repository, this.fleetRepository});

  final WorkOrderRepository repository;
  final FleetRepository? fleetRepository;

  @override
  Future<LoginSession?> login(String user, String password) async {
    return LoginSession(
      repository: repository,
      fleetRepository: fleetRepository ?? FakeFleetRepository(),
      technicianName: 'Joao Tecnico',
    );
  }

  @override
  Future<LoginSession?> refresh(String refreshToken) async => null;

  @override
  Future<LoginSession?> completeFirstAccess(
    FirstAccessRegistration registration,
  ) async {
    return LoginSession(
      repository: repository,
      fleetRepository: fleetRepository ?? FakeFleetRepository(),
      technicianName: 'Joao Tecnico',
    );
  }

  @override
  Future<bool> validateTechnicianInvite(String code) async => true;

  @override
  Future<LoginSession?> registerWithTechnicianInvite(
    TechnicianInviteRegistration registration,
  ) async {
    return LoginSession(
      repository: repository,
      fleetRepository: fleetRepository ?? FakeFleetRepository(),
      technicianName: registration.name,
    );
  }
}

class _FleetRepositoryCarroLongo implements FleetRepository {
  @override
  Future<List<FleetVehicle>> listVehicles() async {
    return const [
      FleetVehicle(
        id: 'veiculo-longo',
        name: 'Carro 01 - Manutencao preventiva corretiva instalacao urgente',
        plate: 'LDC1A23',
      ),
    ];
  }

  @override
  Future<void> registerFueling(FuelingInput input) async {}
}

class _RepositorioDeTeste implements WorkOrderRepository {
  _RepositorioDeTeste({
    this.equipments,
    this.status = WorkOrderStatus.pending,
    this.backendStatus,
    this.serviceType = 'preventiva',
    this.checklistType = 'semestral',
    this.checklist,
    this.scheduledAt,
  });

  final List<WorkOrderEquipment>? equipments;
  final WorkOrderStatus status;
  final String? backendStatus;
  final String serviceType;
  final String checklistType;
  final List<WorkOrderChecklistItem>? checklist;
  final DateTime? scheduledAt;

  String? startedOrderId;
  String? arrivedOrderId;
  String? savedChecklistEquipmentId;
  String? savedChecklistType;
  MachineDataInput? savedMachineInput;
  Map<String, String> savedChecklistResponses = {};
  String? uploadedPhotoCode;
  String? uploadedPhotoEquipmentId;
  String? initialEvidenceOrderId;
  String? finalEvidenceOrderId;
  String? finishedOrderId;
  FinalizeWorkOrderInput? finishInput;
  Object? finishError;
  Object? checklistPhotoError;
  bool finishWaitingSync = false;
  int pendingSyncCountValue = 0;
  int syncPendingCalls = 0;
  OfflineSyncResult syncResult = const OfflineSyncResult();

  @override
  Future<List<WorkOrder>> listMine() async {
    return [
      WorkOrder(
        id: 'OS-API',
        clientName: 'Cliente API',
        address: 'Rua da API, 10',
        equipment: 'Split API',
        equipments:
            equipments ??
            const [
              WorkOrderEquipment(
                id: 'EQ-101',
                qrCode: 'QR-101',
                type: 'Split',
                brand: 'LG',
                name: 'Evaporadora sala 101',
                location: 'Sala 101',
                model: 'Split API',
                btus: 24000,
                gas: 'R-410A',
                serialNumber: 'SN-101',
              ),
              WorkOrderEquipment(
                id: 'EQ-102',
                qrCode: 'QR-102',
                type: 'Split',
                brand: 'Samsung',
                name: 'Evaporadora sala 102',
                location: 'Sala 102',
                model: 'Split API',
                btus: 24000,
                gas: 'R-410A',
                serialNumber: 'SN-102',
              ),
            ],
        maintenanceType: 'Limpeza de filtros',
        serviceType: serviceType,
        checklistType: checklistType,
        checklist:
            checklist ??
            const [
              WorkOrderChecklistItem(
                code: 'M1',
                label: 'Desligar pelo controle remoto',
                kind: 'checkbox',
              ),
              WorkOrderChecklistItem(
                code: 'M4',
                label: 'Foto apos abrir tampa frontal',
                kind: 'foto',
              ),
              WorkOrderChecklistItem(
                code: 'M6',
                label: 'Condicao dos filtros',
                kind: 'select',
                options: ['ok', 'danificado', 'substituido'],
              ),
              WorkOrderChecklistItem(
                code: 'M16',
                label: 'Finalizacao',
                kind: 'finalizacao',
              ),
              WorkOrderChecklistItem(
                code: 'S6',
                label: 'Pressao do fluido refrigerante',
                kind: 'numerico',
                unit: 'bar/psi',
              ),
              WorkOrderChecklistItem(
                code: 'S7',
                label: 'Tipo de fluido refrigerante',
                kind: 'texto',
              ),
            ],
        scheduledAt: scheduledAt ?? DateTime.now(),
        status: status,
        backendStatus: backendStatus,
      ),
    ];
  }

  @override
  Future<WorkOrder> startService(
    WorkOrder order,
    GeoPoint location,
    SafetyCheckInput safety,
  ) async {
    startedOrderId = order.id;
    return order.copyWith(
      status: WorkOrderStatus.inProgress,
      backendStatus: 'em_atendimento',
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

  @override
  Future<void> saveChecklist(
    WorkOrder order, {
    required String equipmentId,
    required String checklistType,
    required List<WorkOrderChecklistResponse> responses,
  }) async {
    savedChecklistEquipmentId = equipmentId;
    savedChecklistType = checklistType;
    savedChecklistResponses = {
      for (final response in responses) response.code: response.value,
    };
  }

  @override
  Future<String> saveChecklistPhoto(
    WorkOrder order, {
    required String equipmentId,
    required String code,
    required ChecklistPhotoFile photo,
  }) async {
    final error = checklistPhotoError;
    if (error != null) {
      throw error;
    }
    uploadedPhotoCode = code;
    uploadedPhotoEquipmentId = equipmentId;
    return '/storage/os/${order.id}/checklist/$equipmentId/$code.jpg';
  }

  @override
  Future<void> saveInitialEvidence(
    WorkOrder order, {
    required String description,
    required ChecklistPhotoFile photo,
  }) async {
    initialEvidenceOrderId = order.id;
  }

  @override
  Future<void> saveFinalEvidence(
    WorkOrder order, {
    required String description,
    required ChecklistPhotoFile photo,
  }) async {
    finalEvidenceOrderId = order.id;
  }

  @override
  Future<WorkOrder> finishWorkOrder(
    WorkOrder order,
    FinalizeWorkOrderInput input,
  ) async {
    final error = finishError;
    if (error != null) {
      throw error;
    }
    finishedOrderId = order.id;
    finishInput = input;
    if (finishWaitingSync) {
      return order.copyWith(
        status: WorkOrderStatus.waitingSync,
        backendStatus: 'aguardando_sync',
      );
    }
    return order.copyWith(
      status: WorkOrderStatus.done,
      backendStatus: 'concluida',
    );
  }

  @override
  Future<WorkOrderEquipment> saveMachineData(
    WorkOrder order,
    MachineDataInput input,
  ) async {
    savedMachineInput = input;
    return WorkOrderEquipment(
      id: input.equipmentId ?? 'EQ-NOVA',
      qrCode: input.qrCode,
      type: input.type,
      brand: input.brand,
      name: input.location,
      location: input.location,
      model: input.model,
      btus: input.btus,
      gas: input.gas,
      serialNumber: input.serialNumber,
      impossibleFields: input.impossibleFields,
    );
  }

  @override
  Future<int> pendingSyncCount() async => pendingSyncCountValue;

  @override
  Future<OfflineSyncResult> syncPending() async {
    syncPendingCalls += 1;
    pendingSyncCountValue = syncResult.failed;
    return syncResult;
  }
}

const _singleEquipment = [
  WorkOrderEquipment(
    id: 'EQ-102',
    qrCode: 'QR-102',
    type: 'Split',
    brand: 'Samsung',
    name: 'Evaporadora sala 102',
    location: 'Sala 102',
    model: 'Split API',
    btus: 24000,
    gas: 'R-410A',
    serialNumber: 'SN-102',
  ),
];

class _PhotoPickerTeste implements ChecklistPhotoPicker {
  const _PhotoPickerTeste();

  @override
  Future<ChecklistPhotoFile?> pickPhoto() async {
    return const ChecklistPhotoFile(
      filename: 'filtro.jpg',
      mimeType: 'image/jpeg',
      bytes: [1, 2, 3],
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

class _BarcodeScannerTeste implements BarcodeScannerService {
  const _BarcodeScannerTeste(this.result);

  final String? result;

  @override
  Future<String?> scanBarcode(BuildContext context) async => result;
}
