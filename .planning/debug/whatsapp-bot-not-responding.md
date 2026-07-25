---
status: resolved
trigger: "o whatts não esta mas respondendo o bot"
created: 2026-07-25T00:00:00-03:00
updated: 2026-07-25T00:00:00-03:00
---

## Current Focus

hypothesis: o servidor de produção está indisponível antes mesmo de o webhook chegar ao código.
test: mapear webhook, autenticação e fluxo de resposta no código local.
expecting: identificar o primeiro ponto em que a mensagem deixa de avançar.
next_action: reiniciar/verificar o serviço da API no servidor de produção e testar o health endpoint.

## Symptoms

expected: Bolt responder mensagens recebidas no WhatsApp.
actual: usuário relata que o bot não está mais respondendo.
errors: ainda não informado.
reproduction: enviar mensagem para o número conectado ao bot.
started: não informado.

## Eliminated

- hypothesis: falha exclusiva no Bolt ou na API de envio Meta
  evidence: os domínios público, admin e API recusaram conexão; o processo nem chega ao webhook.
  timestamp: 2026-07-25

## Evidence

- timestamp: 2026-07-25
  checked: DNS de `api.airmovebr.com.br`
  found: resolve para `191.252.226.11`.
  implication: o domínio existe e aponta para o servidor esperado.

- timestamp: 2026-07-25
  checked: `https://api.airmovebr.com.br/api/v1/health`, `https://admin.airmovebr.com.br` e `https://airmovebr.com.br`
  found: todos recusaram conexão na porta 443.
  implication: a indisponibilidade é de infraestrutura/serviço, não uma falha isolada do bot.

## Resolution

root_cause: servidor de produção na VPS `191.252.226.11` está recusando conexões HTTP/HTTPS; por isso a Meta não consegue entregar o webhook e o Bolt não consegue responder.
fix: reiniciar/verificar Nginx/reverse proxy e processo da API no servidor.
verification: pendente de ação no servidor; repetir o health check e enviar uma mensagem de teste no WhatsApp.
files_changed: []

## Recovery update — 2026-07-25 18:10 BRT

- SSH confirmed backend, Caddy and PostgreSQL containers running; backend and PostgreSQL healthy.
- Backend logs identified the actual failure: Prisma expected `orcamentos.pdf_gerado_em`, but the production database lacked that column. This broke the WhatsApp conversation list after the commercial deploy.
- `prisma migrate status` confirmed two pending official migrations: `20260725150000_orcamento_status_lifecycle` and `20260725170000_orcamento_canais_assinatura`.
- Applied both migrations with `prisma migrate deploy` on production. No credentials or secrets were displayed.
- Post-recovery checks passed: health endpoint returned `ok`, Prisma reported schema up to date, and an empty local POST to `/api/v1/webhooks/whatsapp` returned `recebido: true` with zero messages.

Current outcome: backend and webhook route are operational. A real incoming WhatsApp message still needs user confirmation because no external message was sent during recovery.
