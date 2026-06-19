# Cadastro de Veiculos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Disponibilizar cadastro, edicao e exclusao logica de veiculos na tela Frota.

**Architecture:** O controller e o facade `AdminService` expoem o CRUD ja implementado em `AdminFrotaService`. O admin adiciona uma aba dedicada e reutiliza o fluxo atual de autenticacao, mensagens e recarga da frota.

**Tech Stack:** NestJS, Prisma, HTML, CSS, JavaScript e Node Test Runner.

---

### Task 1: Expor API de veiculos

**Files:**
- Modify: `apps/backend/src/modules/admin/admin.controller.ts`
- Modify: `apps/backend/src/modules/admin/admin.service.ts`
- Test: `apps/backend/src/modules/admin/admin.service.part-02.spec.ts`

- [x] Confirmar o teste vermelho para metodos ausentes no facade.
- [x] Adicionar delegacoes e rotas GET/POST/PATCH/DELETE.
- [x] Executar os testes backend e confirmar sucesso.

### Task 2: Criar aba Veiculos

**Files:**
- Modify: `apps/admin/index.html`
- Modify: `apps/admin/css/frota.css`
- Modify: `apps/admin/js/modules/api.js`
- Modify: `apps/admin/js/modules/auth.js`
- Modify: `apps/admin/js/modules/frota.js`
- Modify: `apps/admin/js/modules/eventos.js`
- Test: `tests/frontend-contracts.test.js`

- [x] Usar o contrato frontend vermelho existente.
- [x] Adicionar formulario, lista, estados e integracao CRUD.
- [x] Executar `npm.cmd run frontend:test` e confirmar sucesso.

### Task 3: Validacao final

**Files:**
- Verify: todos os arquivos modificados

- [x] Executar frontend, backend, build e lint.
- [x] Revisar diff e confirmar que nao houve commit nem deploy.
