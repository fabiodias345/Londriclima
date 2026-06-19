# Resumo AIRMOVEBR

Atualizado em: 19/06/2026

## Estado Atual

- Workspace: `C:\develop\LondriClima`
- Branch atual: `dev`
- Commit local atual: `b5b8b84`
- Produto: site, admin, API e app Android inicial da AIRMOVEBR.
- Fluxos principais ja existem: pre-chamado, OS, agenda, recorrencia, frota, tecnicos/equipes, PMOC com Assinafy e envio SMTP.
- Google Drive esta fora do fluxo PMOC nesta fase.
- Proximo trabalho: reduzir arquivos grandes sem mudar regra de negocio.

## Regra de Manutencao

- Meta: arquivos de codigo nosso com no maximo 500 linhas.
- Excecoes temporarias: `package-lock.json`, `apps/admin/vendor/leaflet/*` e `apps/backend/prisma/schema.prisma`.
- Metodo: mover primeiro, melhorar depois.
- Cada fase deve terminar com teste antes de seguir.

## Arquivos Acima de 500 Linhas

Levantamento em 19/06/2026, ignorando `node_modules`, `.git`, `dist`, `build`, `coverage`, `uploads`, `tmp` e binarios:

```text
6332  package-lock.json
4244  apps/admin/script.js
2066  apps/backend/src/modules/admin/admin.service.spec.ts
2045  apps/backend/src/modules/admin/services/admin-relatorio-tecnico-core.service.ts
1837  apps/admin/styles.css
1060  apps/landing/css/style.css
 964  apps/admin/index.html
 732  apps/backend/src/modules/ordens-servico/ordens-servico.service.ts
 681  apps/backend/src/app.http.spec.ts
 661  apps/admin/vendor/leaflet/leaflet.css
 642  apps/backend/prisma/schema.prisma
 634  apps/backend/src/modules/ordens-servico/ordens-servico.service.spec.ts
 620  apps/backend/prisma/seed.ts
 588  apps/backend/src/modules/automacoes/automacoes.service.ts
 564  apps/backend/src/modules/site/site.service.spec.ts
 559  apps/backend/src/modules/automacoes/automacoes.service.spec.ts
 558  apps/backend/src/modules/assinaturas/assinafy.service.ts
 529  apps/backend/src/modules/admin/admin.service.ts
 512  apps/backend/src/modules/site/site.service.ts
```

## Novas Fases

### Fase 11: Admin JS

- [x] Quebrar `apps/admin/script.js` em modulos reais por dominio.
- [x] Usar `apps/admin/js/main.js` como entrada.
- [x] Criar ou completar modulos:
  - `api`
  - `ui/dom`
  - `auth`
  - `clientes`
  - `agenda`
  - `recorrencias`
  - `frota`
  - `pmoc`
- [x] Manter compatibilidade com o HTML atual durante a migracao.
- [x] Validar com `npm.cmd run frontend:test`.

### Fase 12: Admin CSS e HTML

- [x] Mover regras reais de `apps/admin/styles.css` para CSS por area.
- [x] Manter `styles.css` como agregador temporario.
- [ ] Reduzir `apps/admin/index.html` separando blocos repetidos ou templates carregados pelo JS.
- [ ] Nao trocar classes sem necessidade.
- [x] Rodar `npm.cmd run frontend:test`.
- [ ] Validar visualmente o admin local.

### Fase 13: Backend Services

- [ ] Reduzir `admin-relatorio-tecnico-core.service.ts`.
- [ ] Reduzir `ordens-servico.service.ts`.
- [x] Reduzir `automacoes.service.ts`.
- [x] Reduzir `assinafy.service.ts`.
- [x] Reduzir `site.service.ts`.
- [ ] Extrair helpers, builders e services internos por responsabilidade.
- [ ] Services principais devem ficar como orquestradores.
- [x] Validar com `backend:test`, `backend:build` e `backend:lint`.

### Fase 14: Testes Grandes

- [ ] Dividir `admin.service.spec.ts` por dominio.
- [ ] Dividir `app.http.spec.ts` por fluxo.
- [ ] Dividir specs de OS, automacoes e site.
- [ ] Criar fixtures/factories compartilhadas quando reduzir duplicacao real.
- [ ] Validar com `npm.cmd run backend:test`.

### Fase 15: Revisao Final de Limite

- [ ] Recontar linhas de todos os arquivos.
- [ ] Justificar qualquer excecao restante acima de 500 linhas.
- [ ] Rodar validacao completa:

```text
npm.cmd run frontend:test
npm.cmd run backend:test
npm.cmd run backend:build
npm.cmd run backend:lint
```

## Producao

- Dominio: `airmovebr.com.br`
- IP esperado: `191.252.226.11`
- Deploy real: `/opt/airmovebr/repo`
- Bloqueio conhecido: dominio ainda depende de apontamento DNS/gestao no Registro.br.
- Antes de trocar DNS, validar por IP:

```text
http://191.252.226.11
http://191.252.226.11/admin
http://191.252.226.11/api/v1/health
```

## Seguranca

- Nao commitar `.env`, `.env.local` ou `.env.production`.
- Nao expor senha, token SMTP, token Assinafy, JWT secret, chave privada ou banco no chat.
- Banco de producao deve ficar sem porta publica.
- PDFs assinados locais ficam em `apps/backend/storage/` e nao devem ir para Git.
