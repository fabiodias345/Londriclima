# Corrigir Listagem de Planos Recorrentes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restaurar a renderização dos planos recorrentes após salvar ou abrir a tela de recorrências.

**Architecture:** O admin monta um bundle em tempo de execução concatenando os `*Root` em `apps/admin/js/main.js`. A correção restaura somente `recurrenceStatusRoot`, que fornece as funções de resumo, filtro e renderização esperadas pelo contrato atual, sem incluir a implementação legada e duplicada de `recurrenceUiRoot`.

**Tech Stack:** JavaScript ES Modules, Node.js test runner, HTML estático, Git, Docker Compose.

---

### Task 1: Restaurar o módulo de renderização

**Files:**
- Modify: `apps/admin/js/main.js`
- Modify: `apps/admin/index.html`
- Modify: `tests/frontend-contracts.test.js`
- Modify: `docs/superpowers/specs/2026-06-30-corrigir-listagem-planos-recorrentes-design.md`

- [ ] **Step 1: Atualizar o contrato para exigir o módulo correto**

Adicionar as verificações:

```js
assert.match(main, /import \{ recurrenceStatusRoot \} from "\.\/modules\/recurrence-status\.js\?v=20260630-reclist"/);
assert.match(main, /agendaRoot,\s*recurrenceStatusRoot,\s*recorrenciasRoot/);
```

- [ ] **Step 2: Executar o teste e confirmar a falha**

Run: `npm run frontend:test`
Expected: FAIL porque `recurrenceStatusRoot` não está importado nem incluído em `adminSources`.

- [ ] **Step 3: Implementar a correção mínima**

Em `apps/admin/js/main.js`, importar:

```js
import { recurrenceStatusRoot } from "./modules/recurrence-status.js?v=20260630-reclist";
```

E incluir após `agendaRoot`:

```js
recurrenceStatusRoot,
```

Atualizar todos os sufixos de cache do arquivo para `20260630-reclist` e, em `apps/admin/index.html`, usar:

```html
<script type="module" src="./js/main.js?v=20260630-reclist"></script>
```

- [ ] **Step 4: Corrigir a especificação**

Trocar referências a `recurrenceUiRoot` por `recurrenceStatusRoot` e registrar que `recurrenceUiRoot` permanece fora do bundle para evitar declarações duplicadas.

- [ ] **Step 5: Executar validações**

Run: `npm run frontend:test`
Expected: todos os testes passam.

Run: `git diff --check`
Expected: nenhuma saída.

- [ ] **Step 6: Commitar a correção**

```powershell
git add apps/admin/index.html apps/admin/js/main.js tests/frontend-contracts.test.js docs/superpowers/specs/2026-06-30-corrigir-listagem-planos-recorrentes-design.md docs/superpowers/plans/2026-06-30-corrigir-listagem-planos-recorrentes.md
git commit -m "fix: restaura listagem de planos recorrentes"
```

### Task 2: Publicar e verificar

**Files:**
- No source files created or modified.

- [ ] **Step 1: Alinhar e publicar branches**

```powershell
git push origin dev
git switch main
git merge --ff-only dev
git push origin main
git switch dev
```

- [ ] **Step 2: Fazer deploy na Locaweb**

```powershell
ssh root@191.252.226.11 "cd /opt/airmovebr/repo && git pull --ff-only origin main && docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml up -d --build"
```

- [ ] **Step 3: Verificar produção**

Confirmar que `HEAD`, `origin/main`, `origin/dev` e o checkout da Locaweb apontam para o mesmo commit e que `https://api.airmovebr.com.br/api/v1/health` responde com sucesso.
