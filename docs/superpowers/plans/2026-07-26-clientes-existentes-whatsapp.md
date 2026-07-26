# Clientes existentes no WhatsApp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Impedir clientes duplicados no atendimento WhatsApp e exigir vínculo explícito antes de orçamento ou levantamento.

**Architecture:** O backend devolve candidatos da mesma empresa cujo telefone normalizado corresponde ao telefone WhatsApp e expõe um endpoint administrativo de vínculo. O Admin mostra os candidatos, permite usar um, editar seus dados antes de vinculá-lo ou cadastrar outra pessoa; depois do vínculo mantém a escolha entre orçamento e levantamento.

**Tech Stack:** NestJS, Prisma, JWT/AdminRoleGuard, JavaScript modular e node:test.

---

### Task 1: Candidatos e vínculo seguro no backend

**Files:**
- Modify: `apps/backend/src/modules/whatsapp/whatsapp.service.ts`
- Modify: `apps/backend/src/modules/whatsapp/whatsapp-admin.controller.ts`
- Modify: `apps/backend/src/modules/whatsapp/whatsapp.service.spec.ts`

- [ ] **Step 1: Escrever testes de candidato, isolamento e vínculo**

Cobrir a normalização de `5543999999999` e `43999999999`, nenhum candidato, candidato de outra empresa ignorado e vínculo somente com cliente da empresa da conversa.

- [ ] **Step 2: Implementar busca por telefone normalizado**

Criar método privado que remove caracteres não numéricos, compara os últimos 10/11 dígitos e devolve somente `id`, `nome`, `telefone`, `email` e endereço principal dos clientes da empresa.

- [ ] **Step 3: Expor candidatos e vínculo**

`obterConversa()` devolve `clientes_candidatos` apenas quando não há `cliente`. Adicionar `POST /admin/whatsapp/conversas/:id/cliente/:clienteId`, validar empresa, atualizar `clienteId`, emitir `cliente_vinculado` e devolver o detalhe atualizado.

- [ ] **Step 4: Executar validação backend**

Run: `node.exe --test -r ts-node/register "src/modules/whatsapp/whatsapp.service.spec.ts"` em `apps/backend` e `npm.cmd run backend:build` na raiz.

- [ ] **Step 5: Commitar backend**

```powershell
git add apps/backend/src/modules/whatsapp
git commit -m "feat: sugerir cliente existente no WhatsApp"
```

### Task 2: Resolução explícita no Admin

**Files:**
- Modify: `apps/admin/js/modules/whatsapp.js`
- Modify: `tests/frontend-contracts.test.js`

- [ ] **Step 1: Escrever contrato frontend**

Validar candidatos, os botões `Usar este cliente`, `Atualizar dados`, `Não é este cliente` e o endpoint de vínculo.

- [ ] **Step 2: Renderizar candidatos antes do pré-cadastro**

Se `clientes_candidatos` existir, exibir nome, telefone, e-mail e endereço; `Usar` chama o vínculo, `Atualizar dados` abre o formulário preenchido e salva por `PATCH /admin/clientes/:id` antes de vincular; `Não é este cliente` abre o pré-cadastro sem excluir nem alterar candidatos.

- [ ] **Step 3: Preservar a decisão comercial**

Depois de criar, atualizar ou vincular, limpar apenas o modo local e renderizar `Montar orçamento` e `Agendar visita ao cliente / Levantamento técnico`.

- [ ] **Step 4: Executar validação frontend**

Run: `node.exe --check apps/admin/js/modules/whatsapp.js` e `npm.cmd run frontend:test`.

- [ ] **Step 5: Commitar Admin**

```powershell
git add apps/admin/js/modules/whatsapp.js tests/frontend-contracts.test.js
git commit -m "feat: resolver cliente existente no atendimento"
```

### Task 3: Checkpoint da fase

**Files:**
- Modify: `docs/resumo.md`

- [ ] **Step 1: Registrar comportamento e validações**

Registrar que o telefone é usado apenas para sugerir; nunca vincular automaticamente quando há múltiplos candidatos; cliente novo continua sendo criado somente após escolha explícita.

- [ ] **Step 2: Validar diffs**

Run: `git diff --check`.

- [ ] **Step 3: Commitar checkpoint**

```powershell
git add docs/resumo.md docs/superpowers/plans/2026-07-26-clientes-existentes-whatsapp.md
git commit -m "docs: registrar clientes existentes no WhatsApp"
```
