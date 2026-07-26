# Fase L2 — Laudo técnico web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que técnico ou auxiliar autenticado registre e finalize um laudo de levantamento pelo navegador, liberando somente cobrança de visita autorizada ou orçamento da atendente.

**Architecture:** O módulo `levantamentos` passa a persistir laudo, itens técnicos, fotos e histórico de finalização/reabertura. Uma API protegida por `MobileRoleGuard` atende a tela web compacta do técnico; endpoints administrativos mantêm a visão comercial. O valor e o aceite do cliente ficam em uma autorização operacional administrada, nunca no laudo do técnico.

**Tech Stack:** NestJS, Prisma/PostgreSQL, JWT, `FileInterceptor`, armazenamento local existente, JavaScript modular do Admin e `node:test`.

---

## Mapa de arquivos

- Modify: `apps/backend/prisma/schema.prisma` — laudo, itens, fotos e autorização de visita.
- Create: `apps/backend/prisma/migrations/<timestamp>_laudo_levantamento/migration.sql` — tabelas, enum e índices.
- Modify: `apps/backend/src/modules/levantamentos/levantamentos.service.ts` — estados administrativos e visões comerciais.
- Create: `apps/backend/src/modules/levantamentos/levantamentos-tecnico.service.ts` — autorização, rascunho, fotos e finalização do técnico.
- Create: `apps/backend/src/modules/levantamentos/levantamentos-tecnico.controller.ts` — API `mobile/levantamentos` protegida.
- Create: `apps/backend/src/modules/levantamentos/dto/laudo-levantamento.dto.ts` — DTOs de rascunho, item, decisão e reabertura.
- Create: `apps/backend/src/modules/levantamentos/levantamentos-tecnico.service.spec.ts` — testes de regras e isolamento.
- Modify: `apps/backend/src/modules/levantamentos/levantamentos.module.ts` — registrar serviço e controller.
- Modify: `apps/admin/index.html`, `apps/admin/js/main.js` — inserir a área técnica restrita no painel existente quando o login for técnico/auxiliar.
- Create: `apps/admin/js/modules/tecnico-levantamentos.js` — lista e formulário de laudo, sem preços.
- Modify: `apps/admin/js/modules/auth.js`, `apps/admin/js/modules/session.js` — direcionar técnico/auxiliar para a área técnica e impedir navegação administrativa.
- Modify: `apps/admin/js/modules/comercial.js`, `apps/admin/js/modules/whatsapp.js` — exibir laudo final, autorização de visita e ação comercial condicional.
- Modify: `tests/frontend-contracts.test.js` — contratos da área técnica e fluxo comercial.
- Modify: `docs/resumo.md` — checkpoint da L2.

Não modificar `apps/admin_mobile`, `apps/mobile`, Flutter, APK, templates Meta, PDF, Assinafy ou a regra comercial de R$ 2.000 nesta fase.

### Task 1: Persistir laudo, recomendações, fotos e autorização

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/<timestamp>_laudo_levantamento/migration.sql`

- [ ] **Step 1: Escrever o schema e migration**

Adicionar ao levantamento os campos `diagnostico`, `causaProvavel`, `servicosRecomendados`, `observacoes`, `limpezaRecomendada`, `laudoRascunhoEm`, `laudoFinalizadoEm`, `laudoFinalizadoPorId`, `reabertoEm`, `reabertoPorId` e `motivoReabertura`. Criar `LevantamentoItemTecnico`, `LevantamentoFoto` e `LevantamentoAutorizacao`.

```prisma
enum LimpezaRecomendada { nao_recomendada recomendada urgente }
enum LevantamentoDecisao { precisa_orcamento resolvido_na_visita }
enum AutorizacaoLevantamentoStatus { aguardando aprovada recusada expirada }

model LevantamentoAutorizacao {
  id              String @id @default(uuid()) @db.Uuid
  levantamentoId  String @unique @map("levantamento_id") @db.Uuid
  status          AutorizacaoLevantamentoStatus @default(aguardando)
  valor           Decimal? @db.Decimal(12, 2)
  expiraEm        DateTime @map("expira_em")
  autorizadaEm    DateTime? @map("autorizada_em")
  @@map("levantamentos_autorizacoes")
}
```

- [ ] **Step 2: Gerar cliente e validar schema**

Run: `npm.cmd run backend:prisma:generate` e `npx.cmd prisma validate --schema prisma/schema.prisma`.

Expected: schema válido e Prisma Client contém os novos delegates.

- [ ] **Step 3: Build de segurança**

Run: `npm.cmd run backend:build`.

Expected: build aprovado.

- [ ] **Step 4: Commitar persistência**

```powershell
git add apps/backend/prisma
git commit -m "feat: persistir laudos de levantamento"
```

### Task 2: Implementar regras do laudo do técnico

**Files:**
- Create: `apps/backend/src/modules/levantamentos/dto/laudo-levantamento.dto.ts`
- Create: `apps/backend/src/modules/levantamentos/levantamentos-tecnico.service.ts`
- Create: `apps/backend/src/modules/levantamentos/levantamentos-tecnico.service.spec.ts`

- [ ] **Step 1: Escrever testes de acesso e estados**

Cobrir técnico atribuído diretamente, membro de equipe, técnico de outra empresa, rascunho, finalização de orçamento, finalização resolvida e bloqueio após finalização.

```ts
await assert.rejects(
  () => service.salvarRascunho("levantamento-1", { diagnostico: "Teste" }, tecnicoDeOutraEmpresa),
  /levantamento nao encontrado/i
);
await assert.rejects(
  () => service.finalizar("levantamento-1", { decisao: "precisa_orcamento" }, tecnico),
  /diagnostico obrigatorio/i
);
```

- [ ] **Step 2: Rodar o spec antes da implementação**

Run: `node.exe --test -r ts-node/register "src/modules/levantamentos/levantamentos-tecnico.service.spec.ts"` em `apps/backend`.

Expected: FAIL porque o serviço ainda não existe.

- [ ] **Step 3: Implementar consulta e autorização de técnico**

Criar `listarMeus`, `obterMeu`, `iniciar` e `salvarRascunho`. Autorizar quando `tecnicoId === user.id` ou existir `EquipeMembro` ativo da equipe do levantamento; admin não usa esses métodos. `iniciar` move apenas `agendado` para `em_levantamento`.

```ts
const acesso = {
  empresaId: user.empresa_id,
  OR: [
    { tecnicoId: user.id },
    { equipe: { membros: { some: { usuarioId: user.id, ativo: true } } } }
  ]
};
```

- [ ] **Step 4: Implementar finalização imutável**

`finalizar` exige `diagnostico` e `decisao`. Para `precisa_orcamento`, grava `diagnostico_concluido`. Para `resolvido_na_visita`, cria/atualiza autorização em `aguardando`, com `expiraEm = agora + 20 minutos`, e deixa o levantamento em `em_levantamento` até o aceite administrativo. Após `laudoFinalizadoEm`, `salvarRascunho` retorna conflito; somente admin pode reabrir com motivo.

- [ ] **Step 5: Executar testes e build**

Run: spec do passo 2 e `npm.cmd run backend:build` na raiz.

Expected: testes e build aprovados.

- [ ] **Step 6: Commitar regras**

```powershell
git add apps/backend/src/modules/levantamentos
git commit -m "feat: registrar laudo tecnico de levantamento"
```

### Task 3: Fotos, limpeza e API para técnico

**Files:**
- Modify: `apps/backend/src/modules/levantamentos/levantamentos.module.ts`
- Create: `apps/backend/src/modules/levantamentos/levantamentos-tecnico.controller.ts`
- Modify: `apps/backend/src/modules/levantamentos/levantamentos-tecnico.service.ts`
- Modify: `apps/backend/src/modules/levantamentos/levantamentos-tecnico.service.spec.ts`

- [ ] **Step 1: Escrever testes de foto e limpeza**

Cobrir upload autorizado, bloqueio de arquivo não-imagem, limpeza recomendada sem foto ao finalizar e foto de limpeza com sucesso.

```ts
await assert.rejects(
  () => service.finalizar("levantamento-1", { diagnostico: "Serpentina suja", limpeza_recomendada: "recomendada", decisao: "precisa_orcamento" }, tecnico),
  /foto obrigatoria para limpeza recomendada/i
);
```

- [ ] **Step 2: Implementar armazenamento isolado**

Reutilizar validação de imagem e padrão de `OrdensServicoService`, salvando em `storage/levantamentos/<levantamentoId>/fotos`. Persistir URL, legenda, mime, tamanho e indicador `limpeza`. Falha de upload não altera o estado do laudo.

- [ ] **Step 3: Expor endpoints técnicos**

Adicionar no controller `@Controller("mobile/levantamentos")` com `JwtAuthGuard` e `MobileRoleGuard`:

```text
GET    /mobile/levantamentos
GET    /mobile/levantamentos/:id
POST   /mobile/levantamentos/:id/iniciar
PATCH  /mobile/levantamentos/:id/rascunho
POST   /mobile/levantamentos/:id/fotos
POST   /mobile/levantamentos/:id/finalizar
```

O upload usa `FileInterceptor("foto", { limits: { fileSize: 8 * 1024 * 1024 } })`; toda resposta devolve URLs e campos em `snake_case`.

- [ ] **Step 4: Executar testes e build**

Run: spec técnico e `npm.cmd run backend:build`.

Expected: API e upload validados sem expor laudo de outro técnico.

- [ ] **Step 5: Commitar API técnica**

```powershell
git add apps/backend/src/modules/levantamentos
git commit -m "feat: expor laudo de levantamento ao tecnico"
```

### Task 4: Autorização de serviço simples e visão da atendente

**Files:**
- Modify: `apps/backend/src/modules/levantamentos/levantamentos.service.ts`
- Modify: `apps/backend/src/modules/levantamentos/levantamentos.controller.ts`
- Modify: `apps/backend/src/modules/whatsapp/whatsapp.service.ts`
- Modify: `apps/backend/src/modules/whatsapp/whatsapp-admin.controller.ts`
- Modify: `apps/backend/src/modules/levantamentos/levantamentos-tecnico.service.spec.ts`

- [ ] **Step 1: Escrever testes de autorização de 20 minutos**

Cobrir criação somente após laudo resolutivo, valor somente administrativo, aprovação antes do vencimento, recusa, expiração e ausência de criação de orçamento de reparo.

```ts
const autorizacao = await service.solicitarAutorizacao("levantamento-1", { valor: 180 }, admin);
assert.equal(autorizacao.status, "aguardando");
assert.equal(autorizacao.expira_em, "2026-07-26T12:20:00.000Z");
```

- [ ] **Step 2: Implementar autorização e reabertura administrativa**

Criar `POST /admin/levantamentos/:id/autorizacao`, `POST /admin/levantamentos/:id/autorizacao/aprovar`, `POST /admin/levantamentos/:id/autorizacao/recusar` e `POST /admin/levantamentos/:id/reabrir`. `solicitar` exige laudo final `resolvido_na_visita`, valor positivo e expiração de vinte minutos. `aprovar` exige horário não vencido e muda levantamento para `resolvido_na_visita`; técnico só então pode registrar execução resolvida. `reabrir` exige motivo e restaura `em_levantamento`.

- [ ] **Step 3: Expor contexto na conversa e no comercial**

No detalhe WhatsApp, incluir laudo, fotos, limpeza e autorização. Para `diagnostico_concluido`, mostrar apenas o atalho de criar orçamento com contexto. Para limpeza recomendada, incluir recomendação e foto no texto de autorização, mas não inserir item/preço automaticamente.

- [ ] **Step 4: Rodar testes direcionados**

Run: spec técnico e `node.exe --test -r ts-node/register "src/modules/whatsapp/whatsapp.service.spec.ts"` em `apps/backend`.

Expected: atendimento vê as decisões, mas preço não é aceito na API técnica.

- [ ] **Step 5: Commitar decisão comercial**

```powershell
git add apps/backend/src/modules/levantamentos apps/backend/src/modules/whatsapp
git commit -m "feat: autorizar servico simples de levantamento"
```

### Task 5: Interface web do técnico e ações do Admin

**Files:**
- Modify: `apps/admin/index.html`
- Modify: `apps/admin/js/main.js`
- Modify: `apps/admin/js/modules/auth.js`
- Modify: `apps/admin/js/modules/session.js`
- Create: `apps/admin/js/modules/tecnico-levantamentos.js`
- Modify: `apps/admin/js/modules/comercial.js`
- Modify: `apps/admin/js/modules/whatsapp.js`
- Modify: `tests/frontend-contracts.test.js`

- [ ] **Step 1: Escrever contratos frontend**

Validar os endpoints `mobile/levantamentos`, botões `Salvar rascunho` e `Finalizar levantamento`, upload de foto, aviso de vinte minutos, limpeza com foto e ausência de campos de preço na tela técnica.

- [ ] **Step 2: Criar área restrita do técnico**

Após login técnico/auxiliar, esconder todo menu administrativo e renderizar somente `Meus levantamentos`. A lista usa `GET /mobile/levantamentos`; o detalhe usa `GET /mobile/levantamentos/:id`. O formulário contém diagnóstico, causa, serviços, itens sem valor, limpeza, observações, fotos e decisão.

```js
if (["tecnico", "auxiliar"].includes(sessao.role)) {
  renderTecnicoLevantamentos();
  return;
}
```

- [ ] **Step 3: Implementar rascunho, foto e finalização**

`Salvar rascunho` usa `PATCH /mobile/levantamentos/:id/rascunho`; foto usa `FormData` com campo `foto`; `Finalizar levantamento` exige confirmação da decisão. Para limpeza `recomendada`/`urgente`, bloquear o botão até existir foto marcada como limpeza. O formulário não possui valor, desconto ou ação de orçamento.

- [ ] **Step 4: Atualizar Admin**

Na aba Levantamentos e conversa WhatsApp, exibir laudo, galeria, limpeza recomendada e autorização. Exibir `Informar valor e pedir autorização` somente para admin e somente em laudo resolutivo; mostrar contador de 20 minutos e os botões de aprovar, recusar e reabrir conforme estado.

- [ ] **Step 5: Executar validações frontend**

Run: `node.exe --check apps/admin/js/modules/tecnico-levantamentos.js` e `npm.cmd run frontend:test`.

Expected: sintaxe válida e contratos aprovados.

- [ ] **Step 6: Commitar interface L2**

```powershell
git add apps/admin/index.html apps/admin/js tests/frontend-contracts.test.js
git commit -m "feat: permitir laudo tecnico pelo painel web"
```

### Task 6: Validação e checkpoint L2

**Files:**
- Modify: `docs/resumo.md`

- [ ] **Step 1: Executar validações completas**

Run: `npm.cmd run backend:prisma:generate`, `npm.cmd run backend:build`, `npm.cmd run backend:test`, `npm.cmd run frontend:test` e `git diff --check`.

Expected: todas as suítes aprovadas; registrar bloqueio conhecido somente se houver evidência reproduzível.

- [ ] **Step 2: Validar o fluxo manual**

Entrar como técnico, abrir levantamento próprio, salvar rascunho, anexar foto de limpeza e finalizar. Como admin, confirmar que o laudo aparece. Testar reparo com orçamento e serviço simples: informar valor, aguardar autorização, aprovar antes de 20 minutos e recusar/vencer sem permitir execução.

- [ ] **Step 3: Atualizar checkpoint e commit final**

Registrar Fase L2 concluída e próximo foco (integração Flutter/app técnico, se solicitada) em `docs/resumo.md`.

```powershell
git add docs/resumo.md
git commit -m "docs: concluir fase L2 de laudo tecnico"
```

## Revisão do plano

- **Cobertura:** laudo em rascunho, autorização por técnico/equipe, fotos, limpeza com evidência, finalização, reabertura, autorização de vinte minutos, interface técnica e visão administrativa estão cobertas.
- **Escopo:** técnico não recebe campos de preço; envio real de template Meta, Flutter e assinatura de orçamento ficam fora desta fase.
- **Consistência:** somente a decisão `precisa_orcamento` libera proposta; somente a autorização administrativa aprovada libera execução do serviço simples e limpeza adicional.
