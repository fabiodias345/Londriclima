# Agenda de levantamentos técnicos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a agenda administrativa retornar levantamentos técnicos agendados junto com as O.S., sem quebrar o contrato atual da agenda.

**Architecture:** `listarAgenda` consultará O.S. e levantamentos em paralelo, mapeará cada tipo para o mesmo formato operacional e ordenará o resultado por horário e criação. O painel aceitará os status de levantamento na agenda e exibirá o cartão sem oferecer edição de O.S. para esse tipo de item. A consulta de O.S. ficará responsável somente por buscar dados; o mapeamento existente será extraído para um método privado reutilizável.

**Tech Stack:** NestJS, TypeScript, Prisma, Node test runner.

---

### Task 1: Corrigir a composição da agenda

**Files:**
- Modify: `apps/backend/src/modules/admin/services/admin-agenda.service.ts:36-344`
- Modify: `apps/admin/js/modules/api.js:36`
- Modify: `apps/admin/js/modules/auth.js:43-66`
- Modify: `apps/admin/js/modules/agenda.js:21-39`

- [ ] **Step 1: Separar consulta e mapeamento das O.S.**

Remover o `return` de dentro de `buscarOrdensAgenda`, criar `mapearOrdemAgenda` com o mapeamento atualmente existente e fazer `listarAgenda` usar `mapearOrdemAgenda` e `mapearLevantamentoAgenda` antes da ordenação.

- [ ] **Step 2: Preservar o formato de cada item**

Manter para O.S. os campos atuais (`cliente`, `endereco`, `equipamentos`, `eventos`, `evidencias`, `checklist` e `assinatura`) e usar `tipo: "levantamento"` para os novos itens, com isolamento por `empresaId`.

- [ ] **Step 3: Validar o build e o diff**

Run: `npm.cmd run backend:build`

Expected: `nest build` termina com código 0.

Run: `git diff --check`

Expected: nenhuma saída de erro.

### Task 2: Validar o comportamento da agenda

**Files:**
- Test: `apps/backend/src/modules/admin/admin.service.part-03.spec.ts`
- Test: `apps/backend/src/modules/admin/admin.service.part-01.spec.ts`
- Test: `tests/frontend-contracts.test.js`

- [ ] **Step 1: Executar os testes direcionados existentes**

Run: `npm.cmd run backend:test -- --runInBand apps/backend/src/modules/admin/admin.service.part-01.spec.ts apps/backend/src/modules/admin/admin.service.part-03.spec.ts`

Expected: os testes terminam sem falha funcional.

- [ ] **Step 2: Confirmar o escopo final**

Run: `git status --short`

Expected: somente os arquivos do serviço/visualização da agenda e este plano/documentação aparecem modificados; nenhum arquivo em `apps/admin_mobile` ou `apps/mobile` é alterado.

- [ ] **Step 3: Validar o contrato frontend**

Run: `npm.cmd run frontend:test`

Expected: os testes frontend terminam sem falha funcional.
