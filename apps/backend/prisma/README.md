# Banco de Dados

O backend usa PostgreSQL com Prisma. O schema inicial já nasce preparado para multi-tenant por `empresa_id` nas tabelas transacionais.

## Comandos

```bash
npm run docker:up
npm run backend:prisma:generate
npm run backend:prisma:migrate
npm run backend:prisma:seed
```

## Decisões

- Toda OS pertence a uma empresa.
- OS concluída é tratada como imutável na camada de serviço.
- Eventos de status guardam horário e GPS por ação do técnico.
- Evidências antes/depois são únicas por OS.
- Auxiliar técnico é vínculo operacional da equipe na Fase 1, sem usuário de login.
- O seed inicial cria a empresa piloto `LondriClima`.
