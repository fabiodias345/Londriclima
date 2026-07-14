# AIRMOVEBR Mobile

Aplicativo Flutter para a operacao AIRMOVEBR.

## Estado atual

- Login de teste: `teste`
- Senha de teste: `123456`
- Login local API: `tecnico@airmovebr.local`
- Senha local API: `123456`
- Dashboard com lista de OS, detalhe, equipamentos e inicio de atendimento com GPS

## Fases concluidas

1. Dashboard com filtros e dados fake.
2. Tela de detalhe da OS.
3. Lista de varias maquinas no mesmo atendimento.
4. Login real e listagem via API.
5. Iniciar atendimento com GPS e status `em_atendimento`.
6. Selecionar maquina existente ou cadastrar nova maquina com dados obrigatorios.
7. Receber `checklist_tipo` e checklist flat da API.
8. Selecionar maquina antes de iniciar checklist.
9. Renderizar checklist por tipo de campo.
10. Salvar checklist preenchido por maquina.
11. Cadastro guiado de maquina: seletores de tipo/gas e BTUs numerico.

## Proximas fases

1. Fotos dentro dos itens do checklist.
2. Assinatura do cliente e finalizar OS.
3. Offline/sync.
4. Codigo de barras/QR.

## Comandos

```bash
flutter test
flutter analyze
flutter build apk --debug --dart-define=MOBILE_API_BASE_URL=https://api.airmovebr.com.br
```

Para testar conectado na API real, informe o IP da maquina que esta rodando o backend:

```bash
flutter run --dart-define=MOBILE_API_BASE_URL=http://SEU_IP:3000
```

Na rede local atual:

```bash
flutter run --dart-define=MOBILE_API_BASE_URL=http://10.91.93.11:3000
```

Para producao:

```bash
flutter run --dart-define=MOBILE_API_BASE_URL=https://api.airmovebr.com.br
```

O modo operacional exige `MOBILE_API_BASE_URL`. O fake local somente e habilitado com `--dart-define=MOBILE_DEMO_MODE=true`.

APK debug gerado em:

```text
build/app/outputs/flutter-apk/app-debug.apk
```
