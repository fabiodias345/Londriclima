# Resumo AIRMOVEBR

Atualizado em: 19/06/2026

## Estado Atual

- Workspace: `C:\develop\LondriClima`
- Branch atual: `dev`
- Commit local atual: topo de `dev` com fases 14 e 15.
- Produto: site, admin, API e app Android inicial da AIRMOVEBR.
- Fluxos principais ja existem: pre-chamado, OS, agenda, recorrencia, frota, tecnicos/equipes, PMOC com Assinafy e envio SMTP.
- Google Drive esta fora do fluxo PMOC nesta fase.
- Fase atual: fases 14 e 15 concluidas localmente; pendente deploy.

## Regra de Manutencao

- Meta: arquivos de codigo nosso com no maximo 500 linhas.
- Excecoes temporarias: `package-lock.json`, `apps/admin/vendor/leaflet/*` e `apps/backend/prisma/schema.prisma`.
- Metodo: mover primeiro, melhorar depois.
- Cada fase deve terminar com teste antes de seguir.

## Arquivos Acima de 500 Linhas

Recontagem em 19/06/2026 apos divisao dos specs, ignorando `node_modules`, `.git`, `dist`, `build`, `coverage`, `uploads`, `tmp` e binarios:

```text
6332  package-lock.json
1835  apps/backend/src/modules/admin/services/admin-relatorio-tecnico-core.service.ts
 926  apps/admin/index.html
 910  apps/landing/css/style.css
 636  apps/backend/src/modules/ordens-servico/ordens-servico.service.ts
 605  apps/admin/vendor/leaflet/leaflet.css
 588  apps/backend/prisma/seed.ts
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

- [x] Dividir `admin.service.spec.ts` por dominio.
- [x] Dividir `app.http.spec.ts` por fluxo.
- [x] Dividir specs de OS, automacoes e site.
- [x] Criar fixtures/factories compartilhadas somente quando reduzir duplicacao real.
- [x] Validar com `npm.cmd run backend:test`.

Arquivos criados: `*.part-XX.spec.ts` nos mesmos diretorios dos specs originais.
Observacao: `app.http` agora autentica no `before` de cada parte para evitar dependencia de ordem entre arquivos.

### Fase 15: Revisao Final de Limite

- [x] Recontar linhas de todos os arquivos.
- [x] Justificar qualquer excecao restante acima de 500 linhas.
- [x] Rodar validacao completa:

```text
npm.cmd run frontend:test
npm.cmd run backend:test
npm.cmd run backend:build
npm.cmd run backend:lint
```

Excecoes/pendencias restantes acima de 500 linhas:

- `package-lock.json`: lockfile gerado.
- `apps/admin/vendor/leaflet/leaflet.css`: vendor externo.
- `apps/backend/src/modules/admin/services/admin-relatorio-tecnico-core.service.ts`: pendencia herdada da fase 13.
- `apps/backend/src/modules/ordens-servico/ordens-servico.service.ts`: pendencia herdada da fase 13.
- `apps/backend/prisma/seed.ts`: seed operacional, deve ser quebrado em proxima rodada.
- `apps/admin/index.html`: pendencia herdada da fase 12.
- `apps/landing/css/style.css`: pendencia de CSS da landing.

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
