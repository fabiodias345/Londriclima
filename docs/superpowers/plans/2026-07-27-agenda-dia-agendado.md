# Agenda: destaque de dia agendado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar dias com agendamento em verde suave no calendário mensal da agenda Admin.

**Architecture:** `renderAgendaMonthGrid` já calcula `dayItems` por data; a célula receberá `has-scheduled` quando essa lista não estiver vazia. O CSS aplicará fundo verde suave, mantendo seleção e destaque do dia atual acima dele.

**Tech Stack:** JavaScript vanilla, CSS, Node test runner.

---

### Task 1: Aplicar estado visual no calendário

**Files:**
- Modify: `apps/admin/js/modules/frota.js:521-562`
- Modify: `apps/admin/css/agenda.css:43-61`

- [ ] **Step 1: Adicionar classe de estado à célula**

Depois de calcular `dayItems`, adicionar:

```js
cell.classList.toggle("has-scheduled", dayItems.length > 0);
```

- [ ] **Step 2: Adicionar estilo verde suave**

Adicionar regra antes dos estados de hover/active:

```css
.agenda-month-cell.has-scheduled { background: #ecfdf3; }
```

Manter a regra `.agenda-month-cell.active` depois dela para o dia selecionado continuar azul.

### Task 2: Validar contrato e frontend

**Files:**
- Modify: `tests/frontend-contracts.test.js:424-430`

- [ ] **Step 1: Cobrir regra de classe**

Adicionar asserção:

```js
assert.match(script, /has-scheduled/);
```

- [ ] **Step 2: Executar validações**

```powershell
npm.cmd run frontend:test
git diff --check
```

Esperado: 30 ou mais testes aprovados, nenhuma falha e nenhum erro de whitespace.

- [ ] **Step 3: Confirmar escopo**

```powershell
git status --short
```

Esperado: somente arquivos da agenda, teste e documentação/plano já existentes; nenhum arquivo Flutter/mobile alterado.
