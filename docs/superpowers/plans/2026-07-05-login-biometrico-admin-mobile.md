# Login Biometrico Admin Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir login por digital no app admin mobile usando refresh token seguro.

**Architecture:** Reaproveitar o mesmo padrao do app tecnico, mas isolado em `apps/admin_mobile`. O login manual salva refresh token; o login biometrico autentica no Android e chama refresh na API.

**Tech Stack:** Flutter, Dart, local_auth, flutter_secure_storage, Android FlutterFragmentActivity.

---

### Task 1: Dependencias e Android

**Files:**
- Modify: `apps/admin_mobile/pubspec.yaml`
- Modify: `apps/admin_mobile/android/app/src/main/AndroidManifest.xml`
- Modify: `apps/admin_mobile/android/app/src/main/kotlin/br/com/airmovebr/admin_mobile/MainActivity.kt`

- [ ] Add `local_auth` and `flutter_secure_storage`.
- [ ] Add biometric permissions.
- [ ] Change MainActivity to `FlutterFragmentActivity`.

### Task 2: Servicos de biometria e token

**Files:**
- Create: `apps/admin_mobile/lib/src/services/admin_biometric_auth_service.dart`
- Create: `apps/admin_mobile/lib/src/services/admin_refresh_token_store.dart`

- [ ] Implement biometric availability and authentication.
- [ ] Implement secure refresh token read/write/clear with admin-specific key.

### Task 3: Refresh API e tela de login

**Files:**
- Modify: `apps/admin_mobile/lib/src/services/admin_api_client.dart`
- Modify: `apps/admin_mobile/lib/src/screens/login_screen.dart`
- Modify: `apps/admin_mobile/lib/src/app.dart`

- [ ] Add `AdminApiClient.refresh`.
- [ ] Inject biometric/token services in login screen.
- [ ] Save token after manual login.
- [ ] Add `Entrar com digital`.
- [ ] Clear token on failed refresh.

### Task 4: Validacao

**Commands:**

```powershell
cd E:\develop\Londriclima\apps\admin_mobile
flutter pub get
flutter analyze --no-pub
flutter test --no-pub
```
