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
| [Resumo raiz](../resumo.md) | Resumo mais recente do estado do projeto. |
| [README raiz](../README.md) | Como subir e validar o projeto. |
| [Mobile README](../apps/mobile/README.md) | Como testar e buildar o APK. |

## Estado rapido

- Site: `https://airmovebr.com.br/`
- Admin: `https://admin.airmovebr.com.br/`
- API: `https://api.airmovebr.com.br/api/v1`
- Desenvolvimento mobile atual: maquina local.

## Mobile

Fases concluidas:

1. Dashboard.
2. Detalhe da OS.
3. Varias maquinas no mesmo atendimento.
4. Login/API real.
5. Iniciar servico com GPS.

Proximas fases:

1. Cheguei ao cliente.
2. Foto antes.
3. Checklist por equipamento.
4. Foto depois.
5. Assinatura e finalizar OS.
6. Offline/sync.

Comando local atual:

```text
cd C:\develop\LondriClima\apps\mobile
flutter run --dart-define=MOBILE_API_BASE_URL=http://10.91.93.11:3000
```
