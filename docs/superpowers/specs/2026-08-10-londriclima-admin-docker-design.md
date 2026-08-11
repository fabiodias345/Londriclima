# Ambiente Docker local do Admin Londriclima

## Objetivo

Executar o painel real de `apps/admin` em ambiente local isolado para testes com o Strix, sem depender de `admin.airmovebr.com.br`.

## Arquitetura

- Caddy serve `apps/admin` e encaminha `/api/*` ao backend.
- Backend NestJS executa na porta interna 3000.
- PostgreSQL executa em volume local persistente.
- Adminer e Solar PRO ficam fora da composição.

## Segurança e escopo

- Usar somente variáveis de desenvolvimento e banco local.
- Desativar workers, integrações externas e credenciais de produção.
- Expor apenas a porta HTTP local necessária.
- Remover os containers após o teste; preservar o volume até solicitação explícita.

## Verificação

- Admin: `http://localhost/admin/`
- API: `http://localhost/api/v1/health`
- O ambiente só será considerado pronto quando banco e backend estiverem saudáveis.
- O Strix testará o admin e a API locais.
