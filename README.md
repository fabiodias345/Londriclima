# AIRMOVEBR Digital

Plataforma de gestao de servicos em campo para empresas de manutencao,
reparo e instalacao de ar-condicionado. O projeto nasceu para a operacao
da AIRMOVEBR em Londrina/PR e esta estruturado para evoluir para um SaaS
multiempresa.

O fluxo principal e:

```text
site -> pre-chamado -> painel admin -> ordem de servico -> tecnico -> evidencias/checklist/GPS -> relatorios
```

## Estado atual

O repositorio ja possui:

- Backend NestJS com API REST, autenticacao JWT, Prisma e PostgreSQL.
- Banco modelado com empresas, usuarios, clientes, equipamentos, ordens de
  servico, evidencias, checklist, assinatura, automacoes e frota.
- Painel administrativo web estatico em `apps/admin`.
- Landing page publica em `apps/landing`, integrada ao endpoint de
  pre-chamados.
- Docker Compose local para PostgreSQL e Adminer.
- Testes unitarios/HTTP do backend e testes de contrato do frontend.
- Documentacao de produto, API, telemetria GPS e implantacao.

Ainda estao como roadmap ou documentacao, e nao como app completo neste
repositorio: aplicativo mobile Flutter, automacoes reais de PDF/e-mail/WhatsApp
e fluxo gravavel completo de PMOC.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Backend | Node.js 20+, NestJS 10, TypeScript |
| Banco | PostgreSQL 16, Prisma 5 |
| Admin | HTML, CSS, JavaScript e Leaflet local |
| Landing | HTML, CSS e JavaScript |
| Infra local | Docker Compose |
| Testes | `node:test`, Nest Testing, ESLint |

## Estrutura do repositorio

```text
Londriclima/
+-- apps/
|   +-- backend/          # API REST, Prisma, seed e testes
|   +-- admin/            # Painel administrativo web
|   +-- landing/          # Site publico
+-- docs/                 # PRD, API spec, memoria e implantacao
+-- infra/                # Docker Compose local/producao e scripts
+-- storage/              # Arquivos locais de desenvolvimento
+-- tests/                # Testes de contrato do frontend
+-- package.json          # Scripts do monorepo
+-- resumo.md             # Estado operacional recente do projeto
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
PATCH /admin/pre-chamados/:osId/aprovar
PATCH /admin/pre-chamados/:osId/rejeitar

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
- [Telemetria GPS](./docs/telemetria-gps.md)
- [Implantacao em producao](./docs/implantacao-producao.md)
- [Prisma README](./apps/backend/prisma/README.md)

## Fluxo de ordem de servico

```text
pre_chamado
  +-- rejeitar -> rejeitada
  +-- aprovar  -> aberta
                 +-- iniciar_rota    -> em_deslocamento
                 +-- cheguei_cliente -> em_atendimento
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

Antes de publicar, valide DNS, `.env.production`, backup do banco, HTTPS e
permissoes de acesso.
