# AIRMOVEBR Mobile

Aplicativo Flutter para a operacao AIRMOVEBR.

## Estado atual

- Login de teste: `teste`
- Senha de teste: `123456`
- Login local API: `tecnico@airmovebr.local`
- Senha local API: `123456`
- Dashboard com lista de OS, detalhe, equipamentos e inicio de servico com GPS

## Fases concluidas

1. Dashboard com filtros e dados fake.
2. Tela de detalhe da OS.
3. Lista de varias maquinas no mesmo atendimento.
4. Login real e listagem via API.
5. Iniciar servico com GPS e status `em_deslocamento`.

## Proximas fases

1. Cheguei ao cliente.
2. Foto antes.
3. Checklist por equipamento.
4. Foto depois.
5. Assinatura do cliente e finalizar OS.
6. Offline/sync.
7. Codigo de barras/QR.

## Comandos

```bash
flutter test
flutter analyze
flutter build apk --debug
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

Sem `MOBILE_API_BASE_URL`, o app usa dados fake locais para teste.

APK debug gerado em:

```text
build/app/outputs/flutter-apk/app-debug.apk
```
