import 'dart:io';

import 'package:airmovebr_mobile/src/auth/biometric_auth_service.dart';
import 'package:airmovebr_mobile/src/auth/mobile_login_gateway.dart';
import 'package:airmovebr_mobile/src/auth/refresh_token_store.dart';
import 'package:airmovebr_mobile/src/data/fake_work_order_repository.dart';
import 'package:airmovebr_mobile/src/repositories/fleet_repository.dart';
import 'package:airmovebr_mobile/src/screens/dashboard_screen.dart';
import 'package:airmovebr_mobile/src/screens/login_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('login biometrico renova sessao e troca refresh token', (
    tester,
  ) async {
    final biometric = _FakeBiometricAuth();
    final store = _FakeRefreshTokenStore('refresh-antigo');
    final gateway = _FakeLoginGateway();

    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: gateway,
          biometricAuth: biometric,
          refreshTokenStore: store,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('biometricLoginButton')), findsOneWidget);
    await tester.tap(find.byKey(const Key('biometricLoginButton')));
    await tester.pumpAndSettle();

    expect(biometric.authenticateCalls, 1);
    expect(gateway.refreshedWith, 'refresh-antigo');
    expect(store.token, 'refresh-novo');
    expect(find.byType(DashboardScreen), findsOneWidget);
  });

  testWidgets('refresh rejeitado remove acesso biometrico', (tester) async {
    final store = _FakeRefreshTokenStore('refresh-invalido');
    final gateway = _FakeLoginGateway(rejectRefresh: true);

    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: gateway,
          biometricAuth: _FakeBiometricAuth(),
          refreshTokenStore: store,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('biometricLoginButton')));
    await tester.pumpAndSettle();

    expect(store.clearCalls, 1);
    expect(find.byKey(const Key('biometricLoginButton')), findsNothing);
    expect(
      find.text('Sessão expirada. Entre novamente com login e senha.'),
      findsOneWidget,
    );
  });

  testWidgets('falha de rede preserva refresh token', (tester) async {
    final store = _FakeRefreshTokenStore('refresh-valido');
    final gateway = _FakeLoginGateway(throwOnRefresh: true);

    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: gateway,
          biometricAuth: _FakeBiometricAuth(),
          refreshTokenStore: store,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('biometricLoginButton')));
    await tester.pumpAndSettle();

    expect(store.clearCalls, 0);
    expect(store.token, 'refresh-valido');
    expect(find.text('Falha ao conectar na API.'), findsOneWidget);
  });

  testWidgets('login por senha permite ativar acesso biometrico', (
    tester,
  ) async {
    final store = _FakeRefreshTokenStore(null);

    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _FakeLoginGateway(),
          biometricAuth: _FakeBiometricAuth(),
          refreshTokenStore: store,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('loginUserField')), 'tecnico');
    await tester.enterText(
      find.byKey(const Key('loginPasswordField')),
      '123456',
    );
    await tester.tap(find.byKey(const Key('loginSubmitButton')));
    await tester.pumpAndSettle();

    expect(find.text('Ativar acesso por digital?'), findsOneWidget);
    await tester.tap(find.byKey(const Key('enableBiometricButton')));
    await tester.pumpAndSettle();

    expect(store.token, 'refresh-novo');
    expect(find.byType(DashboardScreen), findsOneWidget);
  });

  testWidgets('cancelamento biometrico mantem login convencional', (
    tester,
  ) async {
    final biometric = _FakeBiometricAuth(authenticated: false);
    final store = _FakeRefreshTokenStore('refresh-valido');

    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          loginGateway: _FakeLoginGateway(),
          biometricAuth: biometric,
          refreshTokenStore: store,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('biometricLoginButton')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('loginUserField')), findsOneWidget);
    expect(find.byKey(const Key('loginSubmitButton')), findsOneWidget);
    expect(store.clearCalls, 0);
  });
}

class _FakeBiometricAuth implements BiometricAuthService {
  _FakeBiometricAuth({this.authenticated = true});

  final bool authenticated;
  int authenticateCalls = 0;

  @override
  Future<bool> authenticate() async {
    authenticateCalls++;
    return authenticated;
  }

  @override
  Future<bool> isAvailable() async => true;
}

class _FakeRefreshTokenStore implements RefreshTokenStore {
  _FakeRefreshTokenStore(this.token);

  String? token;
  int clearCalls = 0;

  @override
  Future<void> clear() async {
    clearCalls++;
    token = null;
  }

  @override
  Future<String?> read() async => token;

  @override
  Future<void> write(String refreshToken) async {
    token = refreshToken;
  }
}

class _FakeLoginGateway implements MobileLoginGateway {
  _FakeLoginGateway({this.rejectRefresh = false, this.throwOnRefresh = false});

  final bool rejectRefresh;
  final bool throwOnRefresh;
  String? refreshedWith;

  LoginSession _session() => LoginSession(
    repository: FakeWorkOrderRepository(),
    fleetRepository: FakeFleetRepository(),
    technicianName: 'João Técnico',
    refreshToken: 'refresh-novo',
  );

  @override
  Future<LoginSession?> login(String user, String password) async => _session();

  @override
  Future<LoginSession?> refresh(String refreshToken) async {
    refreshedWith = refreshToken;
    if (throwOnRefresh) throw const SocketException('API indisponível');
    if (rejectRefresh) return null;
    return _session();
  }

  @override
  Future<LoginSession?> completeFirstAccess(
    FirstAccessRegistration registration,
  ) async => _session();

  @override
  Future<LoginSession?> registerWithTechnicianInvite(
    TechnicianInviteRegistration registration,
  ) async => _session();

  @override
  Future<bool> validateTechnicianInvite(String code) async => true;
}
