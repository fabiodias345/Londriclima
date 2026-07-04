# Clima Admin Mobile

Aplicativo Flutter separado para administradores da Clima do Brasil.

## Fase 1

- APK separado do app tecnico.
- Login usando a mesma API do painel web.
- Bloqueio local para qualquer usuario com `role` diferente de `admin`.
- Dashboard com botoes coloridos para O.S., agenda, clientes, PMOC, frota, relatorios, tecnicos e pendencias.
- Telas-resumo de cada modulo preparadas para a Fase 2.

## Comandos

```bash
flutter pub get
flutter analyze --no-pub
flutter build apk --debug --dart-define=ADMIN_API_BASE_URL=https://api.airmovebr.com.br
```

APK debug gerado em:

```text
build/app/outputs/flutter-apk/app-debug.apk
```
