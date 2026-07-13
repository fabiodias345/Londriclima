# Documentacao AIRMOVEBR

Indice dos documentos principais do projeto.

## Projeto

| Documento | Uso |
| --- | --- |
| [Memoria](./memoria.md) | Estado operacional, decisoes e proximos passos. |
| [PRD](./prd.md) | Escopo do produto, fases mobile e regras principais. |
| [API Spec](./api-spec.md) | Endpoints REST do backend. |
| [PMOC](./pmoc.md) | Regras e decisoes do fluxo PMOC. |
| [Telemetria GPS](./telemetria-gps.md) | Decisoes sobre frota e rastreamento. |

## Operacao

| Documento | Uso |
| --- | --- |
| [Deploy Git](./deploy_git.md) | Rotina de commit/push feita manualmente pelo usuario. |
| [Deploy SSH](./deploy_ssh.md) | Rotina de atualizacao da VM. |
| [Implantacao producao](./implantacao-producao.md) | Dados da VM, dominio e validacoes de producao. |
| [Resumo](./resumo.md) | Resumo mais recente do estado do projeto. |
| [README raiz](../README.md) | Como subir e validar o projeto. |
| [Mobile README](../apps/mobile/README.md) | Como testar e buildar o APK. |

## Estado rapido

- Site: `https://airmovebr.com.br/`
- Admin: `https://admin.airmovebr.com.br/`
- API: `https://api.airmovebr.com.br/api/v1`
- API health: `https://api.airmovebr.com.br/api/v1/health`
- Producao Locaweb alinhada pela branch `main`.
- Desenvolvimento mobile atual: maquina local.

## Mobile

Estado atual:

1. App tecnico tem login real, O.S., GPS, multi-maquina, checklist, fotos, assinatura, offline/sync, QR e frota.
2. App admin mobile tem fases 1 a 4 implementadas em modo operacional.
3. WhatsApp Cloud API oficial esta configurado com o numero `+55 43 3067-3793`.
4. Backend processa automacao inicial `enviar_whatsapp`.
5. Banco de producao esta sem migrations pendentes.

Proximos passos:

1. Aprovar/criar templates WhatsApp para mensagens iniciadas pela empresa.
2. Configurar webhook WhatsApp e persistir status real.
3. Validar O.S. real disparando notificacao sozinha.
4. Validar apps tecnico/admin em aparelho real.
5. Gerar APKs somente depois da validacao operacional.

Comando local atual:

```text
cd E:\develop\Londriclima\apps\mobile
flutter run --dart-define=MOBILE_API_BASE_URL=https://api.airmovebr.com.br
```
