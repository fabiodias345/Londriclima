# AIRMOVEBR Digital

Plataforma de gestao de servicos em campo para empresas de manutencao,
reparo e instalacao de ar-condicionado. O projeto nasceu para a operacao
da AIRMOVEBR em Londrina/PR e esta estruturado para evoluir para um SaaS
multiempresa.

O fluxo principal e:

```text
site -> pre-chamado -> painel admin -> ordem de servico -> tecnico -> evidencias/checklist/GPS/assinatura -> relatorios/PMOC/notificacoes
```

## Estado atual

O repositorio ja possui:

- Backend NestJS com API REST, autenticacao JWT, Prisma e PostgreSQL.
- Banco modelado com empresas, usuarios, clientes, equipamentos, ordens de
  servico, evidencias, checklist, assinatura, automacoes e frota.
- Painel administrativo web estatico em `apps/admin`.
- Landing page publica em `apps/landing`, integrada ao endpoint de
  pre-chamados.
- Aplicativo Flutter Android em `apps/mobile`, com login real, O.S. do tecnico,
  multiplos equipamentos, GPS, checklist, fotos, assinatura, QR e fila offline.
- Aplicativo Flutter Android separado em `apps/admin_mobile`, com login admin,
  consultas reais, criacao/reprogramacao de O.S., pre-chamados, PMOC, frota,
  relatorios e PDFs autenticados.
- API mobile para listar OS do tecnico autenticado.
- Fluxo PMOC com previa, PDF, assinatura Gov.br enviada pelo engenheiro e
  e-mail final ao cliente com PDF assinado anexado.
- Automacoes SMTP para assinatura PMOC e envio do relatorio assinado.
- Integracao inicial com Meta WhatsApp Cloud API usando o numero oficial
  `+55 43 3067-3793`.
- Docker Compose local para PostgreSQL e Adminer.
- Testes unitarios/HTTP do backend e testes de contrato do frontend.
- Documentacao de produto, API, telemetria GPS e implantacao.

Ainda estao como proximos passos: templates WhatsApp aprovados para mensagens
iniciadas pela empresa, webhook de status WhatsApp, validacao real de O.S. em
campo, teste completo dos apps em aparelho real e geracao final dos APKs.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Backend | Node.js 20+, NestJS 10, TypeScript |
| Banco | PostgreSQL 16, Prisma 5 |
| Admin | HTML, CSS, JavaScript e Leaflet local |
| Landing | HTML, CSS e JavaScript |
| Mobile | Flutter Android, com apps tecnico e admin separados |
| WhatsApp | Meta WhatsApp Cloud API |
| Infra local | Docker Compose |
| Testes | `node:test`, Nest Testing, ESLint, Flutter test |

## Estrutura do repositorio

```text
Londriclima/
+-- apps/
|   +-- backend/          # API REST, Prisma, seed e testes
|   +-- admin/            # Painel administrativo web
|   +-- landing/          # Site publico
|   +-- mobile/           # APK Flutter Android
+-- docs/                 # PRD, API spec, memoria e implantacao
+-- infra/                # Docker Compose local/producao e scripts
+-- storage/              # Arquivos locais de desenvolvimento
+-- tests/                # Testes de contrato do frontend
+-- checklist.md          # Checklists PMOC para o futuro app tecnico
+-- package.json          # Scripts do monorepo
+-- docs/resumo.md        # Estado operacional recente do projeto
```

## Requisitos

- Node.js 20+
- npm 10+
- Docker com Docker Compose
- Git

## Comecando em ambiente local

Instale as dependencias:

```bash
npm install
```

Suba PostgreSQL e Adminer:

```bash
npm run docker:up
```

Crie o `.env` do backend:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Gere o Prisma Client, aplique as migrations e rode o seed:

```bash
npm run backend:prisma:generate
npm run backend:prisma:migrate
npm run backend:prisma:seed
```

Inicie a API:

```bash
npm run backend:dev
```

Servicos locais esperados:

```text
API:      http://localhost:3000/api/v1
Health:   http://localhost:3000/api/v1/health
Adminer:  http://localhost:8080
Postgres: postgresql://londriclima:londriclima@localhost:5432/londriclima_dev
```

Para servir `apps/admin` e `apps/landing` localmente, use um servidor estatico
apontando para a pasta `apps`:

```bash
npx serve apps -l 5173
```

Depois acesse:

```text
Admin:   http://localhost:5173/admin/
Landing: http://localhost:5173/landing/
```

Login seed/local:

```text
E-mail: tecnico@airmovebr.local
Senha:  123456
```

## Aplicativo mobile

Comandos principais:

```bash
cd apps/mobile
flutter test
flutter analyze
flutter build apk --debug --dart-define=MOBILE_API_BASE_URL=https://api.airmovebr.com.br
```

Teste no celular usando a API local:

```bash
flutter run --dart-define=MOBILE_API_BASE_URL=http://10.91.93.11:3000
```

O APK operacional exige `MOBILE_API_BASE_URL`. Para demo local, use explicitamente `--dart-define=MOBILE_DEMO_MODE=true`.

APK debug:

```text
apps/mobile/build/app/outputs/flutter-apk/app-debug.apk
```

## Scripts principais

| Comando | Funcao |
| --- | --- |
| `npm run backend:dev` | Inicia o backend em modo watch |
| `npm run backend:build` | Compila o backend |
| `npm run backend:test` | Roda os testes do backend |
| `npm run backend:lint` | Roda ESLint no backend |
| `npm run frontend:test` | Valida contratos do admin/landing |
| `npm run backend:prisma:generate` | Gera Prisma Client |
| `npm run backend:prisma:migrate` | Aplica migrations locais |
| `npm run backend:prisma:seed` | Popula dados iniciais |
| `npm run docker:up` | Sobe Postgres e Adminer |
| `npm run docker:down` | Derruba containers locais |
| `npm run docker:logs` | Exibe logs dos containers |

## Endpoints principais

Todos os endpoints usam o prefixo configurado em `API_PREFIX`, por padrao
`/api/v1`.

```text
GET  /health

POST /auth/login
POST /auth/refresh

POST /site/pre-chamados

GET  /admin/pre-chamados
GET  /admin/opcoes-despacho
GET  /admin/frota/localizacoes
GET  /admin/frota/abastecimentos
POST /admin/frota/abastecimentos
GET  /admin/relatorios/frota
GET  /admin/agenda
GET  /admin/clientes
POST /admin/clientes
PATCH /admin/clientes/:clienteId
GET  /admin/relatorios
GET  /admin/pmoc/clientes/:clienteId/previa
GET  /admin/pmoc/clientes/:clienteId/pdf
POST /admin/pmoc/clientes/:clienteId/assinatura-engenheiro
PATCH /admin/pre-chamados/:osId/aprovar
PATCH /admin/pre-chamados/:osId/rejeitar

GET  /mobile/os
GET  /mobile/os/:id

GET  /site/pmoc/assinaturas/:token
POST /site/pmoc/assinaturas/:token/confirmar  # recebe PDF assinado no Gov.br em base64

PATCH /os/:osId/status
PUT   /os/:osId/identificacao-equipamento
POST  /os/:osId/evidencia-inicial
POST  /os/:osId/evidencia-final
POST  /os/:osId/checklist
PATCH /os/:osId/observacoes
POST  /os/:osId/finalizar
```

## Documentacao

- [Visao geral dos docs](./docs/README.md)
- [Memoria do projeto](./docs/memoria.md)
- [PRD](./docs/prd.md)
- [API Spec](./docs/api-spec.md)
- [PMOC](./docs/pmoc.md)
- [Checklists PMOC](./checklist.md)
- [Telemetria GPS](./docs/telemetria-gps.md)
- [Implantacao em producao](./docs/implantacao-producao.md)
- [Prisma README](./apps/backend/prisma/README.md)

## Checklists PMOC

O arquivo [`checklist.md`](./checklist.md) concentra a base operacional dos
checklists de manutencao de ar-condicionado que sera usada no aplicativo do
tecnico. A aba PMOC do painel administrativo nao deve repetir esses itens como
checklist manual; ela deve organizar clientes, equipamentos, pendencias,
relatorios e assinatura tecnica.

Checklists definidos:

| Periodicidade | Foco |
| --- | --- |
| Mensal | Limpeza de filtros, inspecao visual, bandeja de condensado e fotos antes/depois. |
| Trimestral | Limpeza de filtros e serpentina, dreno, gabinete, vedacoes, ruido e fluxo de ar. |
| Semestral | Manutencao completa com condensadora, ventilador, fluido refrigerante, pressao e inspecao eletrica. |
| Anual | Relatorio consolidado, historico de manutencoes, fixacoes, isolamento, tubulacoes e parecer tecnico. |

Esses checklists seguem como referencia inicial conforme Portaria MS 3.523/98
e ABNT NBR 13971. Antes de virar fluxo gravavel no app, cada item deve ser
convertido em campos estruturados, evidencias obrigatorias e validacoes por
periodicidade.

## Fluxo de ordem de servico

```text
pre_chamado
  +-- rejeitar -> rejeitada
  +-- aprovar  -> aberta
                 +-- iniciar_atendimento -> em_atendimento
                 +-- cancelar        -> cancelada
                 +-- finalizar       -> concluida
```

Antes de concluir uma OS, a API valida identificacao do equipamento,
evidencia inicial, checklist, evidencia final, assinatura do responsavel e
geolocalizacao de encerramento.

## Observacoes de seguranca

- Nunca commitar arquivos `.env` reais.
- Trocar os segredos JWT antes de qualquer ambiente compartilhado.
- Manter o banco de producao sem porta publica.
- Revisar permissoes de usuarios antes de cadastrar dados reais de clientes.
- Evitar logs com dados pessoais, enderecos, documentos ou telefones.

## Producao

O plano de implantacao esta documentado em
[docs/implantacao-producao.md](./docs/implantacao-producao.md). O dominio alvo
documentado e `airmovebr.com.br`, com subdominios para admin e API.

Estado operacional atual:

```text
Branches alinhadas: dev, main
Branch em producao: main
Branch de deploy:   main
IP esperado:        191.252.226.11
Health:             https://api.airmovebr.com.br/api/v1/health
```

No ultimo deploy, o banco estava sem migrations pendentes e o backend ficou
healthy. Antes de publicar novas mudancas, validar `.env.production`, migrations,
health publico, SMTP/WhatsApp, backup do banco, HTTPS e permissoes de acesso.
