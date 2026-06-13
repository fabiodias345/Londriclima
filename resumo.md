# Resumo AIRMOVEBR

Atualizado em: 12/06/2026

## Estado Atual

- Branch local: `dev`.
- Projeto local: `C:\develop\LondriClima`.
- Produto: site, admin e API da AIRMOVEBR para operacao de servicos em campo.
- Fluxo principal:

```text
site -> pre-chamado -> painel admin -> OS -> tecnico -> evidencias/checklist/GPS -> relatorios
```

## Acessos Locais

```text
Backend health: http://127.0.0.1:3000/api/v1/health
Admin:          http://127.0.0.1:5174/admin/
Landing:        http://127.0.0.1:5174/landing/
Assinatura PMOC:http://127.0.0.1:5174/landing/assinatura-pmoc.html?token=:token
Adminer:        http://127.0.0.1:8080
Login seed:     tecnico@airmovebr.local / 123456
```

## Feito

### Admin

- Login.
- Pre-chamados.
- Frota com Leaflet/OpenStreetMap.
- Frota separada em `Mapa`, `Consumo` e `Abastecimentos`.
- Agenda com calendario, grade de horarios e OS sem horario destacado.
- Clientes, equipamentos e engenheiros responsaveis.
- PMOC separado por cliente, sem misturar maquinas ou OS.

### PMOC

- Busca/triagem de cliente PMOC.
- Ativacao PMOC para cliente sem cadastro anterior.
- Vinculo de engenheiro responsavel.
- Dossie por cliente.
- Dados demo da Maria com PMOC, engenheiro, maquinas e OS.
- Previa oficial no backend:

```text
GET /api/v1/admin/pmoc/clientes/:clienteId/previa
```

- PDF PMOC real no backend:

```text
GET /api/v1/admin/pmoc/clientes/:clienteId/pdf
```

- Fluxo inicial de assinatura do engenheiro:

```text
POST /api/v1/admin/pmoc/clientes/:clienteId/assinatura-engenheiro
```

- Nova tabela `pmoc_relatorios` com:
  - status;
  - token de assinatura;
  - hash do PDF;
  - e-mail final do cliente;
  - data de e-mail agendado;
  - data de historico finalizado;
  - vinculo com cliente, engenheiro e usuario criador.
- Pagina publica de assinatura PMOC:

```text
/landing/assinatura-pmoc?token=:token
```

- Endpoints publicos de assinatura PMOC:

```text
GET  /api/v1/site/pmoc/assinaturas/:token
POST /api/v1/site/pmoc/assinaturas/:token/confirmar
```

- Confirmacao do engenheiro pelo token:
  - muda `pmoc_relatorios.status` para `assinado`;
  - grava `assinado_em`, `email_cliente`, `email_agendado_em` e `historico_finalizado_em`;
  - cria automacao `enviar_email` com payload do relatorio assinado.
- Solicitacao de assinatura em um clique:
  - operador clica em `Solicitar assinatura`;
  - backend gera o PDF PMOC;
  - backend gera o token internamente;
  - backend cria o link completo com `APP_PUBLIC_URL`;
  - backend agenda e-mail automatico para o engenheiro responsavel;
  - token nao aparece para o operador.
- Worker SMTP das automacoes `enviar_email`:
  - busca automacoes pendentes por lote;
  - reserva como `processando`;
  - envia e-mail de assinatura para engenheiro via SMTP;
  - envia e-mail PMOC assinado para cliente via SMTP;
  - marca `concluida` ou `falhou` com tentativa e erro.

### Teste PMOC realista

- Cliente de teste: `Cris Magnani`.
- E-mail do cliente: `fabiodias38@gmail.com`.
- Cliente ID: `31105d67-16ab-492d-9d03-ee328a62cb06`.
- Dados montados:
  - 20 maquinas;
  - 20 OS concluidas;
  - checklist PMOC completo em todas;
  - evidencias antes/depois;
  - assinatura do cliente;
  - sem pendencias na previa PMOC.
- Relatorio PMOC gerado: `73dea9b8-ea20-4cec-8cfd-fc7032a6644f`.
- E-mail de assinatura enviado ao engenheiro `fabiodias@uel.br`.
- Link de assinatura do teste:

```text
http://127.0.0.1:5174/landing/assinatura-pmoc?token=212095b02f013f26324818aaeb9e2c3872d59b1382fc0d94
```

## Validacoes

Ultimas validacoes locais:

```text
npm.cmd run backend:prisma:generate -> OK
npx.cmd prisma migrate status -> banco local atualizado
npm.cmd run backend:test -> 75/75 OK
npm.cmd run backend:build -> OK
npm.cmd run frontend:test -> 8/8 OK
node --check apps/admin/script.js -> OK
node --check apps/landing/assinatura-pmoc.js -> OK
```

## Producao

- Dominio: `airmovebr.com.br`.
- VM Locaweb Cloud: Ubuntu 24.04.3 LTS.
- IP publico: `191.252.226.11`.
- Deploy na VM: `/opt/airmovebr/repo`.
- Usuario operacional: `airmovebr`.
- UFW: 22, 80 e 443 liberadas.
- Docker e Docker Compose instalados.
- PostgreSQL e backend ja testados em Docker.

Nao subir Caddy/publicacao final ate o DNS estar ajustado no Registro.br.

Registros DNS desejados:

```text
airmovebr.com.br       -> 191.252.226.11
admin.airmovebr.com.br -> 191.252.226.11
api.airmovebr.com.br   -> 191.252.226.11
```

Depois do DNS correto:

```text
cd /opt/airmovebr/repo
docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml up -d caddy
```

Validar:

```text
https://airmovebr.com.br
https://admin.airmovebr.com.br
https://api.airmovebr.com.br/api/v1/health
```

## Proximos Passos

1. Aplicar a migration `20260612200000_pmoc_report_email_history` no banco de producao/homologacao antes de testar fora do local.
2. Corrigir o e-mail final do PMOC:
  - anexar o PDF ao e-mail enviado ao cliente;
  - deixar o corpo do e-mail simples e profissional;
  - reenviar o teste `Cris Magnani` para `fabiodias38@gmail.com`.
3. Evoluir o PDF PMOC para formato profissional:
  - pagina por maquina;
  - ficha tecnica do equipamento;
  - checklist por execucao;
  - campos de resultado;
  - evidencias/fotos quando existirem;
  - declaracao de conformidade e assinaturas ao final.
4. Melhorar o historico PMOC final por maquina, caso precise de trilha detalhada alem do relatorio assinado.
5. Revisar Agenda.
6. Revisar Frota.
7. Aplicar logo real quando o arquivo PNG/JPG/SVG estiver no workspace.
8. Depois disso, homologar com dados reais e reduzir dependencia de demo.

## Seguranca

- Nao commitar `.env.production`.
- Banco de producao sem porta publica.
- Antes de cliente real:
  - backup automatico;
  - logs sem dados sensiveis;
  - revisao de permissoes/admin;
  - politica clara de acesso por tecnico/supervisor/admin.
