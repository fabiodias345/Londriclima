# Login biometrico admin mobile - design

## Escopo

Adicionar login por digital ao app `apps/admin_mobile`, sem alterar backend e sem alterar o app tecnico.

## Comportamento

- Login manual continua obrigatorio no primeiro acesso.
- Apos login admin bem-sucedido, o app salva o `refresh_token` em storage seguro.
- Se houver biometria disponivel e token salvo, a tela mostra `Entrar com digital`.
- Ao tocar no botao, o Android valida a digital e o app renova a sessao em `/api/v1/auth/refresh`.
- Se o refresh falhar, o token salvo e apagado e o usuario volta para login/senha.

## Arquitetura

- `AdminApiClient` ganha metodo `refresh`.
- `AdminBiometricAuthService` encapsula `local_auth`.
- `AdminRefreshTokenStore` encapsula `flutter_secure_storage`.
- `LoginScreen` orquestra login manual, armazenamento do token e login biometrico.
- Android usa `FlutterFragmentActivity` e permissoes biometricas.

## Validacao

- `flutter analyze --no-pub` no `apps/admin_mobile`.
- Testes Flutter existentes do `apps/admin_mobile`.
- Execucao manual com:

```powershell
flutter run -d RQCX100GGZE --dart-define=ADMIN_API_BASE_URL=https://api.airmovebr.com.br
```
