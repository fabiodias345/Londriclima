# Memoria AIRMOVEBR

Atualizado em: 21/06/2026

## Contexto

- Cliente piloto: AIRMOVEBR, Londrina/PR.
- Dominio: `airmovebr.com.br`.
- Repositorio: `https://github.com/fabiodias345/Londriclima.git`.
- Workspace local: `C:\develop\LondriClima`.
- Produto: plataforma para operacao de refrigeracao e climatizacao, com caminho para SaaS multiempresa.
- Restricao da fase atual: uma empresa piloto, custo baixo, sem superdimensionar infraestrutura.

## Estado Git

- Branch local padrao atual: `dev`.
- Branches remotas alinhadas: `dev`, `main`, `seg`.
- Branches devem permanecer alinhadas no mesmo commit antes de deploy.

## Identidade

- Usar marca comercial AIRMOVEBR nas interfaces e dados demo.
- Evitar nomes visiveis `LondriClima` para usuario final.
- Login seed atual: `tecnico@airmovebr.local / 123456`.
- Nomes tecnicos internos legados podem permanecer se renomear quebrar Docker, Prisma, Git ou ambiente local.

## Stack Atual

- Backend: Node.js, NestJS, TypeScript.
- Banco: PostgreSQL, Prisma.
- Admin: HTML, CSS, JavaScript, Leaflet.
- Landing: HTML, CSS, JavaScript.
- Mobile: Flutter Android.
- Infra: Docker Compose local/producao.
- Testes: `node:test`, Nest Testing, ESLint.

## Fluxo Operacional

```text
site -> pre-chamado -> admin -> OS -> tecnico -> evidencias/checklist/GPS -> relatorios
```

## Feito no Produto

- API REST com autenticao JWT e refresh token.
- Multiempresa por `empresa_id`.
- Clientes, enderecos, equipamentos e engenheiros responsaveis.
- OS com status, eventos, GPS, evidencias, checklist e assinatura.
- Admin com login, agenda, clientes, frota, relatorios e PMOC.
- Landing publica com pre-chamado.
- APK Flutter com login, dashboard, filtros, detalhe de OS, lista de equipamentos e inicio de servico com GPS.
- API mobile para listar OS do tecnico logado.
- Seed local de OS demo para testar o APK na maquina local.
- Consulta publica de equipamento protegida por senha.
- Frota com mapa Leaflet, consumo e abastecimentos.
- Testes de backend e contratos do frontend.

## Mobile Atual

Frente em desenvolvimento por fases, testada no celular pelo usuario.

Concluido:

1. Dashboard mobile com dados fake e filtros.
2. Tela de detalhe da OS.
3. Suporte a varias maquinas no mesmo local.
4. Login real via API quando `MOBILE_API_BASE_URL` e informado.
5. Inicio de servico com GPS usando `iniciar_rota`.

Arquivos principais:

```text
apps/mobile/lib/src/
apps/backend/src/modules/mobile/
apps/backend/prisma/seed_mobile_demo.ts
```

Comando local atual:

```text
cd C:\develop\LondriClima\apps\mobile
flutter run --dart-define=MOBILE_API_BASE_URL=http://10.91.93.11:3000
```

Credenciais locais:

```text
tecnico@airmovebr.local / 123456
```

Validacoes recentes:

```text
flutter test
flutter analyze
flutter build apk --debug
npm.cmd run backend:build
```

Proximas fases mobile:

1. `Cheguei ao cliente`.
2. Foto antes.
3. Checklist por equipamento e periodicidade.
4. Foto depois.
5. Assinatura do cliente e finalizar OS.
6. Offline/sync.
7. Codigo de barras/QR por equipamento.

## PMOC Atual

- PMOC organizado por cliente.
- Previa oficial no backend.
- Geracao de PDF PMOC pelo backend.
- Relatorio PMOC persistido com status, token, hash, cliente e engenheiro.
- Dossie PMOC exibe Jan-Dez; vermelho indica mes ja enviado ao engenheiro, verde indica mes pendente.
- Pagina publica de assinatura para engenheiro.
- Admin solicita assinatura sem mostrar token ao operador.
- Engenheiro baixa/recebe o PDF, assina no Gov.br e envia o PDF assinado pela pagina publica.
- Confirmacao so agenda e-mail final ao cliente quando o PDF assinado for recebido.

Endpoints principais:

```text
GET  /api/v1/admin/pmoc/clientes/:clienteId/previa
GET  /api/v1/admin/pmoc/clientes/:clienteId/pdf
POST /api/v1/admin/pmoc/clientes/:clienteId/assinatura-engenheiro
GET  /api/v1/site/pmoc/assinaturas/:token
POST /api/v1/site/pmoc/assinaturas/:token/confirmar
```

## Automacoes e E-mail

- Modulo de automacoes processa itens pendentes por lote.
- SMTP envia:
  - link de assinatura ao engenheiro;
  - relatorio PMOC final assinado ao cliente.
- E-mail final do cliente:
  - assunto com mes/ano e nome do cliente;
  - texto profissional;
  - nome, CPF e CREA do engenheiro;
  - PDF assinado no Gov.br em anexo.
- Payload final inclui cliente, engenheiro, data, hash, nome do arquivo e PDF assinado em base64.

## Infra Producao

- VM: Locaweb Cloud Ubuntu 24.04.3 LTS.
- IP esperado: `191.252.226.11`.
- Deploy na VM: `/opt/airmovebr/repo`.
- Usuario operacional: `airmovebr`.
- Backend/PostgreSQL ja validados internamente em Docker.
- Producao atual online:
  - `https://airmovebr.com.br/`
  - `https://admin.airmovebr.com.br/`
  - `https://api.airmovebr.com.br/api/v1/health`
- Para o desenvolvimento do APK, a prioridade atual e usar a maquina local.

DNS desejado:

```text
airmovebr.com.br       -> 191.252.226.11
admin.airmovebr.com.br -> 191.252.226.11
api.airmovebr.com.br   -> 191.252.226.11
```

## Proximos Passos

1. Testar Fase 5 do APK no celular usando API local.
2. Implementar `Cheguei ao cliente`.
3. Implementar fotos antes/depois.
4. Implementar checklist por equipamento.
5. Implementar assinatura e finalizacao da OS.
6. Depois do fluxo local estar bom, apontar APK para `https://api.airmovebr.com.br`.
7. Retestar formulario publico de pre-chamado pelo dominio e confirmar entrada no painel.
8. Configurar SMTP real em `.env.production`.
9. Testar fluxo PMOC completo fora do local.
10. Evoluir PDF PMOC profissional por maquina.

## Regras de Negocio

- OS so deve concluir com equipamento identificado, evidencias, checklist, assinatura e GPS de encerramento.
- GPS deve ser por eventos de acao, nao rastreamento continuo.
- PMOC deve separar dados por cliente e nao misturar maquinas/OS.
- Dados sensiveis nao devem aparecer em logs ou commits.
- Banco de producao nao deve ter porta publica.

## Comandos de Validacao

```text
npm.cmd run backend:lint
npm.cmd run backend:test
npm.cmd run backend:build
npm.cmd run frontend:test
```
