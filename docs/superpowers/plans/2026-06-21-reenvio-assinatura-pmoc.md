# Reenvio de assinatura PMOC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir reenviar o PMOC com os dados atuais do engenheiro, invalidando tentativas anteriores com segurança.

**Architecture:** O backend resolverá o signatário por nome e e-mail dinâmicos, criará a nova solicitação e substituirá pendências anteriores em uma transação. Webhooks de relatórios cancelados serão ignorados. O admin manterá o botão ativo durante uma pendência e indicará que a ação é um reenvio.

**Tech Stack:** NestJS, Prisma, TypeScript, Node test runner, JavaScript estático.

---

### Task 1: Identidade dinâmica do signatário

**Files:**
- Modify: `apps/backend/src/modules/assinaturas/assinafy.helpers.ts`
- Modify: `apps/backend/src/modules/assinaturas/assinafy.service.ts`
- Test: `apps/backend/src/modules/assinaturas/assinafy.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Adicionar um teste que configure `signers` com o mesmo e-mail e `full_name` diferente e espere rejeição com `Signatario Assinafy`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w apps/backend -- assinafy.service.spec.ts`
Expected: FAIL porque o cadastro divergente ainda é reutilizado.

- [ ] **Step 3: Write minimal implementation**

Incluir `full_name?: unknown` em `AssinafySigner`. Alterar a busca para retornar o signatário completo e comparar nome normalizado antes de reutilizar o ID. Validar e usar somente `previa.engenheiro_responsavel.nome` e `email`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w apps/backend -- assinafy.service.spec.ts`
Expected: PASS.

### Task 2: Substituição segura da solicitação anterior

**Files:**
- Modify: `apps/backend/src/modules/assinaturas/assinafy.service.ts`
- Test: `apps/backend/src/modules/assinaturas/assinafy.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Adicionar testes que comprovem que o reenvio executa `updateMany` para cancelar pendências antes de criar o novo relatório e que webhook de relatório `cancelado` não baixa PDF nem agenda e-mail.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -w apps/backend -- assinafy.service.spec.ts`
Expected: FAIL porque não há cancelamento em lote nem proteção do webhook.

- [ ] **Step 3: Write minimal implementation**

Trocar a criação isolada por transação com:

```ts
await tx.pmocRelatorio.updateMany({
  where: {
    empresaId: usuario.empresa_id,
    clienteId: previa.cliente.id,
    status: PmocRelatorioStatus.aguardando_assinatura_engenheiro
  },
  data: {
    status: PmocRelatorioStatus.cancelado,
    assinafyStatus: "superseded",
    historicoFinalizadoEm: agora
  }
});
```

Depois criar o novo relatório na mesma transação. Em `processarWebhook`, retornar sem efeitos quando o relatório encontrado já estiver `cancelado`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -w apps/backend -- assinafy.service.spec.ts`
Expected: PASS.

### Task 3: Liberar o reenvio no admin

**Files:**
- Modify: `apps/admin/js/modules/agenda.js`
- Test: `tests/frontend-contracts.test.js`

- [ ] **Step 1: Write the failing contract assertions**

Exigir o texto `Reenviar assinatura` e impedir que `hasPendingSignature` desabilite `canRequestSignature`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run frontend:test`
Expected: FAIL porque a pendência atual ainda bloqueia o botão.

- [ ] **Step 3: Write minimal implementation**

Calcular `canRequestSignature` apenas com PMOC pronto e regra de entrega já existente. Quando houver pendência, definir o texto como `Reenviar assinatura`.

- [ ] **Step 4: Run tests and build**

Run: `npm run frontend:test`
Expected: PASS.

Run: `npm run backend:test`
Expected: PASS.

Run: `npm run backend:build`
Expected: build concluído sem erros.

### Task 4: Commit da implementação

**Files:**
- Modify: arquivos listados nas tarefas anteriores
- Create: `docs/superpowers/plans/2026-06-21-reenvio-assinatura-pmoc.md`

- [ ] **Step 1: Validate scope**

Run: `git diff --check && git status --short`
Expected: sem erros de whitespace; alterações do usuário permanecem fora do commit.

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/modules/assinaturas/assinafy.helpers.ts apps/backend/src/modules/assinaturas/assinafy.service.ts apps/backend/src/modules/assinaturas/assinafy.service.spec.ts apps/admin/js/modules/agenda.js tests/frontend-contracts.test.js docs/superpowers/plans/2026-06-21-reenvio-assinatura-pmoc.md
git commit -m "fix: permite reenviar assinatura PMOC"
```
