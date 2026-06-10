# LondriClima Digital

Monorepo da plataforma LondriClima Digital, uma solução FSM para gestão de serviços de refrigeração e climatização em campo.

## Estrutura

```text
Londriclima/
├── docs/                 # Documentação de produto, memória e API
├── apps/
│   ├── backend/          # API REST, automações e banco de dados
│   ├── admin/            # Painel administrativo web
│   ├── landing/          # Website institucional
│   └── mobile/           # App Flutter do técnico
├── infra/
│   ├── docker/           # Configurações auxiliares de infraestrutura
│   └── docker-compose.yml
└── storage/              # Arquivos locais de desenvolvimento
```

## Documentação

- [Visão geral dos docs](./docs/README.md)
- [Memória do projeto](./docs/memoria.md)
- [PRD](./docs/prd.md)
- [API Spec parcial](./docs/api-spec.md)

## Começo do Desenvolvimento

O primeiro foco é o backend com PostgreSQL, autenticação e o fluxo base de Ordens de Serviço.

```bash
npm install
npm run docker:up
npm run backend:dev
```

API local prevista:

```text
http://localhost:3000/api/v1
```

Banco local previsto:

```text
postgresql://londriclima:londriclima@localhost:5432/londriclima_dev
```
