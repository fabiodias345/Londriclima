# Login Biométrico Android Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir login no app técnico por biometria usando um refresh token protegido pelo Android, sem armazenar a senha.

**Architecture:** O gateway de autenticação passa a devolver e renovar o refresh token. Serviços pequenos encapsulam `local_auth` e `flutter_secure_storage`, enquanto a tela de login coordena ativação opcional, autenticação local, renovação remota e fallback para senha.

**Tech Stack:** Flutter, Dart, `local_auth`, `flutter_secure_storage`, Android Keystore, API JWT existente.

---

### Task 1: Dependências e configuração Android

**Files:**
- Modify: `apps/mobile/pubspec.yaml`
- Modify: `apps/mobile/pubspec.lock`
- Modify: `apps/mobile/android/app/build.gradle.kts`
- Modify: `apps/mobile/android/app/src/main/AndroidManifest.xml`
- Modify: `apps/mobile/android/app/src/main/kotlin/br/com/airmovebr/airmovebr_mobile/MainActivity.kt`
- Modify: `apps/mobile/android/app/src/main/res/values/styles.xml`
- Modify: `apps/mobile/android/app/src/main/res/values-night/styles.xml`

- [ ] **Step 1: Adicionar os plugins Flutter**

```powershell
Set-Location apps/mobile
flutter pub add local_auth:^3.0.1 flutter_secure_storage:^10.3.1
```

Expected: `pubspec.yaml` e `pubspec.lock` incluem os dois plugins.

- [ ] **Step 2: Configurar Android 24+ e biometria**

Em `build.gradle.kts`, definir:

```kotlin
minSdk = 24
```

No manifesto, adicionar:

```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.USE_FINGERPRINT" />
```

E impedir backup das credenciais criptografadas:

```xml
<application
    android:allowBackup="false"
    ...>
```

Trocar a activity por:

```kotlin
package br.com.airmovebr.airmovebr_mobile

import io.flutter.embedding.android.FlutterFragmentActivity

class MainActivity : FlutterFragmentActivity()
```

Nos dois arquivos `styles.xml`, usar um tema compatível com `FragmentActivity`:

```xml
<style name="LaunchTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
```

- [ ] **Step 3: Validar resolução nativa**

```powershell
flutter pub get
flutter analyze --no-pub
```

Expected: dependências resolvidas e nenhuma falha de análise.

### Task 2: Sessão renovável no gateway

**Files:**
- Modify: `apps/mobile/lib/src/auth/mobile_login_gateway.dart`
- Modify: `apps/mobile/lib/src/auth/api_login_gateway.dart`
- Modify: `apps/mobile/lib/src/auth/hybrid_login_gateway.dart`
- Modify: `apps/mobile/lib/src/auth/fake_login_gateway.dart`
- Modify: `apps/mobile/test/api_login_gateway_test.dart`

- [ ] **Step 1: Escrever teste do refresh**

Adicionar um servidor HTTP de teste que receba:

```dart
expect(request.uri.path, '/api/v1/auth/refresh');
expect(jsonDecode(await utf8.decoder.bind(request).join()), {
  'refresh_token': 'refresh-antigo',
});
```

E responda:

```dart
jsonEncode({
  'access_token': 'access-novo',
  'refresh_token': 'refresh-novo',
  'usuario': {'nome': 'Técnico'},
})
```

O teste deve verificar:

```dart
expect(session?.refreshToken, 'refresh-novo');
expect(session?.technicianName, 'Técnico');
```

- [ ] **Step 2: Executar o teste e confirmar falha**

```powershell
flutter test test/api_login_gateway_test.dart
```

Expected: FAIL porque `refresh` e `refreshToken` ainda não existem.

- [ ] **Step 3: Estender contrato e implementação**

Adicionar à sessão e ao gateway:

```dart
class LoginSession {
  const LoginSession({
    required this.repository,
    required this.fleetRepository,
    this.technicianName = '',
    this.refreshToken,
  });

  final WorkOrderRepository repository;
  final FleetRepository fleetRepository;
  final String technicianName;
  final String? refreshToken;
}

abstract class MobileLoginGateway {
  Future<LoginSession?> login(String user, String password);
  Future<LoginSession?> refresh(String refreshToken);
  // Métodos de primeiro acesso existentes permanecem inalterados.
}
```

No gateway da API, centralizar a conversão da resposta e implementar:

```dart
Future<LoginSession?> refresh(String refreshToken) async {
  final client = HttpClient()..connectionTimeout = timeout;
  try {
    final request = await client
        .postUrl(baseUrl.resolve('/api/v1/auth/refresh'))
        .timeout(timeout);
    request.headers.contentType = ContentType.json;
    request.write(jsonEncode({'refresh_token': refreshToken}));
    final response = await request.close().timeout(timeout);
    final body = await response.transform(utf8.decoder).join().timeout(timeout);
    if (response.statusCode < 200 || response.statusCode >= 300) return null;
    return _sessionFromResponse(jsonDecode(body) as Map<String, dynamic>);
  } finally {
    client.close(force: true);
  }
}
```

`HybridLoginGateway.refresh` deve delegar para `ApiLoginGateway` somente em modo operacional. `FakeLoginGateway.refresh` deve retornar `null`.

- [ ] **Step 4: Executar os testes**

```powershell
flutter test test/api_login_gateway_test.dart test/hybrid_login_gateway_test.dart
```

Expected: PASS.

### Task 3: Serviços biométrico e armazenamento seguro

**Files:**
- Create: `apps/mobile/lib/src/auth/biometric_auth_service.dart`
- Create: `apps/mobile/lib/src/auth/refresh_token_store.dart`
- Create: `apps/mobile/test/biometric_auth_service_test.dart`
- Create: `apps/mobile/test/refresh_token_store_test.dart`

- [ ] **Step 1: Definir interfaces testáveis**

```dart
abstract interface class BiometricAuthService {
  Future<bool> isAvailable();
  Future<bool> authenticate();
}

abstract interface class RefreshTokenStore {
  Future<String?> read();
  Future<void> write(String refreshToken);
  Future<void> clear();
}
```

- [ ] **Step 2: Implementar biometria do aparelho**

```dart
class DeviceBiometricAuthService implements BiometricAuthService {
  const DeviceBiometricAuthService();

  @override
  Future<bool> isAvailable() async {
    try {
      final auth = LocalAuthentication();
      return await auth.canCheckBiometrics &&
          (await auth.getAvailableBiometrics()).isNotEmpty;
    } on Object {
      return false;
    }
  }

  @override
  Future<bool> authenticate() async {
    try {
      return await LocalAuthentication().authenticate(
        localizedReason: 'Use sua digital para entrar',
        biometricOnly: true,
        persistAcrossBackgrounding: true,
      );
    } on Object {
      return false;
    }
  }
}
```

- [ ] **Step 3: Implementar armazenamento seguro**

```dart
class SecureRefreshTokenStore implements RefreshTokenStore {
  const SecureRefreshTokenStore();
  static const _key = 'technician_refresh_token';

  FlutterSecureStorage get _storage => const FlutterSecureStorage(
    aOptions: AndroidOptions(migrateWithBackup: true),
  );

  @override
  Future<String?> read() => _storage.read(key: _key);

  @override
  Future<void> write(String refreshToken) =>
      _storage.write(key: _key, value: refreshToken);

  @override
  Future<void> clear() => _storage.delete(key: _key);
}
```

- [ ] **Step 4: Testar adaptadores sem plataforma real**

Usar mocks dos canais dos plugins para confirmar disponibilidade, autenticação, leitura, escrita e exclusão sem persistir senha.

```powershell
flutter test test/biometric_auth_service_test.dart test/refresh_token_store_test.dart
```

Expected: PASS.

### Task 4: Fluxo da tela de login

**Files:**
- Modify: `apps/mobile/lib/src/screens/login_screen.dart`
- Modify: `apps/mobile/lib/src/app.dart`
- Modify: `apps/mobile/test/widget_test.dart`

- [ ] **Step 1: Escrever testes de widget com fakes injetáveis**

Criar fakes que implementem os contratos e testar:

```dart
expect(find.byKey(const Key('biometricLoginButton')), findsOneWidget);
await tester.tap(find.byKey(const Key('biometricLoginButton')));
await tester.pumpAndSettle();
expect(fakeBiometric.authenticateCalls, 1);
expect(fakeGateway.refreshedWith, 'refresh-antigo');
expect(fakeStore.savedToken, 'refresh-novo');
expect(find.text('Ordens de serviço'), findsOneWidget);
```

Também cobrir recusa de ativação, cancelamento biométrico, refresh rejeitado com limpeza e falha de rede sem limpeza.

- [ ] **Step 2: Executar os testes e confirmar falha**

```powershell
flutter test test/widget_test.dart
```

Expected: FAIL porque o botão e as dependências ainda não existem.

- [ ] **Step 3: Injetar serviços e detectar disponibilidade**

Adicionar ao `LoginScreen`:

```dart
this.biometricAuth = const DeviceBiometricAuthService(),
this.refreshTokenStore = const SecureRefreshTokenStore(),
```

No `initState`, disponibilizar o botão apenas quando `isAvailable()` e `read()` retornarem biometria e token válidos.

- [ ] **Step 4: Ativar biometria após login por senha**

Depois do login válido, se houver `refreshToken` e biometria disponível, mostrar diálogo `Ativar acesso por digital neste aparelho?`. Ao aceitar, salvar o token; falha no armazenamento não deve impedir a abertura do dashboard.

- [ ] **Step 5: Implementar entrada biométrica**

```dart
Future<void> _loginWithBiometrics() async {
  if (!await widget.biometricAuth.authenticate()) return;
  final token = await widget.refreshTokenStore.read();
  if (token == null || token.isEmpty) return;
  try {
    final session = await widget.loginGateway.refresh(token);
    if (session == null) {
      await widget.refreshTokenStore.clear();
      // Ocultar botão e exigir senha.
      return;
    }
    final rotatedToken = session.refreshToken;
    if (rotatedToken != null && rotatedToken.isNotEmpty) {
      await widget.refreshTokenStore.write(rotatedToken);
    }
    // Abrir dashboard com a nova sessão.
  } on Object {
    // Preservar token e exibir falha de conexão.
  }
}
```

- [ ] **Step 6: Executar suíte e análise**

```powershell
flutter test
flutter analyze --no-pub
```

Expected: todos os testes passam e análise sem erros.

### Task 5: Documentação e verificação final

**Files:**
- Modify: `docs/prd.md`

- [ ] **Step 1: Registrar o recurso implementado**

Adicionar ao app técnico:

```markdown
19. Login biométrico opcional no Android com refresh token em armazenamento seguro.
```

E ao critério de aceite:

```markdown
- Técnico pode ativar login biométrico após autenticação válida, sem armazenamento da senha.
```

- [ ] **Step 2: Verificar diferenças**

```powershell
git diff --check
git status --short
```

Expected: somente arquivos do login biométrico e documentação estão modificados.

- [ ] **Step 3: Commit final**

```powershell
git add apps/mobile docs/prd.md docs/superpowers/plans/2026-07-05-login-biometrico-android.md
git commit -m "feat: adiciona login biometrico no app tecnico"
```
