# Resumo AIRMOVEBR

Atualizado em: 11/06/2026

## Objetivo

Plataforma web/admin/API para a AIRMOVEBR, preparada para virar SaaS de servicos em campo:

```text
site -> pre-chamado -> painel admin -> OS -> tecnico -> evidencias/checklist/GPS -> relatorios
```

## Estado Atual

- Dominio oficial: `airmovebr.com.br`.
- VM Locaweb Cloud criada: Ubuntu 24.04.3 LTS, IP `191.252.226.11`.
- Deploy na VM em `/opt/airmovebr/repo`.
- Acesso SSH por chave com comentario `fabiodias@uel.br`.
- Usuario operacional criado: `airmovebr`.
- Firewall UFW ativo: 22, 80 e 443 liberadas na VM.
- Firewall/rede Locaweb ativo com entrada publica TCP 22, 80 e 443.
- Encaminhamento Locaweb:
  - `22 -> airmovebr-prod (10.1.1.37)`
  - `80 -> airmovebr-prod (10.1.1.37)`
  - `443 -> airmovebr-prod (10.1.1.37)`
- Docker e Docker Compose instalados e testados.
- PostgreSQL rodando em Docker e `healthy`.
- Backend NestJS rodando em Docker.
- Migrations aplicadas com sucesso:
  - `20260610000000_init`
  - `20260610035303_add_vehicle_tracking`
  - `20260610110000_add_vehicle_fuelings`
- Health interno do backend OK:

```text
GET /api/v1/health
```

## Observacao Importante

Nao mexer na publicacao do servidor nem subir o Caddy ate o cliente liberar/ajustar o DNS no Registro.br.

Por enquanto o trabalho pode continuar localmente. Depois, quando o DNS estiver correto, enviar as mudancas para o servidor e finalizar HTTPS.

## Web/Admin

- Landing em `apps/landing`.
- Admin em `apps/admin`.
- Admin tem login, pre-chamados, frota, agenda, clientes e relatorios.
- Frota tem mapa/fallback visual, veiculos separados para demonstracao e relatorio de consumo.
- Abastecimento registra odometro, litros, valor total e posto.
- Calculos: km rodados, km/L, custo por km e gasto total.
- Em producao, web/admin chamam `https://api.airmovebr.com.br/api/v1`.

## Backend

- NestJS + Prisma + PostgreSQL.
- Auth com JWT, refresh token e senha com `scrypt`.
- Endpoints principais:

```text
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/site/pre-chamados
GET  /api/v1/admin/pre-chamados
GET  /api/v1/admin/frota/localizacoes
GET  /api/v1/admin/agenda
GET  /api/v1/admin/clientes
GET  /api/v1/admin/relatorios
GET  /api/v1/admin/relatorios/frota
POST /api/v1/admin/frota/abastecimentos
```

## Testes

Ultima validacao local:

```text
npm.cmd run frontend:test -> 5/5 OK
npm.cmd run backend:build -> OK
```

Validacao na VM:

```text
PostgreSQL healthy
Prisma migrate deploy OK
Backend health interno OK
```

## Commits Importantes

```text
0b9af81 fix: start compiled backend entrypoint
7face29 fix: install openssl in backend image
4c80fae fix: use production api host for web apps
502ea86 chore: support production migrations
d586740 feat: prepare airmovebr production deploy
```

`dev` e `main` estao sincronizadas no GitHub ate `d87d8e4`.

## Bloqueio Atual

O codigo, a VM e a rede publica estao prontos para publicar. O bloqueio restante e DNS.

O DNS esta no Registro.br, com nameservers:

```text
a.auto.dns.br
b.auto.dns.br
```

Estado visto:

```text
airmovebr.com.br -> 107.150.167.202
api.airmovebr.com.br -> nao existe
admin.airmovebr.com.br -> nao existe
```

Teste externo no IP `191.252.226.11`:

```text
80  -> True
443 -> True
```

Caddy foi parado temporariamente para evitar tentativas repetidas de certificado antes do DNS correto. Manter parado ate os tres registros resolverem para `191.252.226.11`.

## Proximos Passos

1. No DNS, criar/ajustar registros A:

```text
airmovebr.com.br       -> 191.252.226.11
admin.airmovebr.com.br -> 191.252.226.11
api.airmovebr.com.br   -> 191.252.226.11
```

2. Testar propagacao:

```text
Resolve-DnsName airmovebr.com.br
Resolve-DnsName admin.airmovebr.com.br
Resolve-DnsName api.airmovebr.com.br
```

3. Subir Caddy:

```text
cd /opt/airmovebr/repo
docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml up -d caddy
```

4. Validar HTTPS:

```text
https://airmovebr.com.br
https://admin.airmovebr.com.br
https://api.airmovebr.com.br/api/v1/health
```

5. Depois do HTTPS OK:
   - testar login admin;
   - criar pre-chamado pela landing;
   - aprovar/rejeitar pre-chamado;
   - testar frota, agenda, clientes e relatorios;
   - revisar `npm audit` e dependencias antes de dados reais.

## Atencao LGPD/Seguranca

- Nao commitar `.env.production`.
- Banco sem porta publica.
- Secrets fortes ja gerados no servidor.
- Acesso por chave SSH, sem senha compartilhada no chat.
- Antes de cliente real: backup automatico, logs sem dados sensiveis e revisao de permissoes/admin.
