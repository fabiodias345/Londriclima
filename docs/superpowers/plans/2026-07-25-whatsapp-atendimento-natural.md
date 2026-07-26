# WhatsApp Natural Atendimento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the WhatsApp bot's menu-driven qualification with a natural, one-field-at-a-time flow that saves the client data and handles business-hours messaging correctly.

**Architecture:** Keep the state machine in `BoltRules`, extend its JSON state with address number and e-mail, and keep CEP lookup in `WhatsAppService`. The human handoff remains the existing `HUMAN_QUEUE` transition. Client creation will accept an optional document and will receive the collected address/e-mail from the conversation.

**Tech Stack:** NestJS, TypeScript, Prisma, `node:test`, WhatsApp Cloud API, ViaCEP.

---

### Task 1: Extend the conversation state and document the test contract

**Files:**
- Modify: `apps/backend/src/modules/whatsapp/bolt/bolt.types.ts`
- Modify: `apps/backend/src/modules/whatsapp/bolt/bolt.rules.ts`
- Test: `apps/backend/src/modules/whatsapp/whatsapp.service.spec.ts`

- [ ] **Step 1: Add the new state fields.**

Extend `BoltData` with nullable `numero` and `email` fields. Initialize both as `null` in `dadosBoltIniciais()` and preserve them in `normalizarDadosBolt()`.

- [ ] **Step 2: Add focused failing tests for state shape.**

Add assertions that `dadosBoltIniciais()` returns `numero: null` and `email: null`, and that `normalizarDadosBolt({ numero: "42", email: "a@b.com" })` preserves both values.

- [ ] **Step 3: Run the focused test.**

Run `npm test -w apps/backend -- --test-name-pattern="Bolt|estado"`.

Expected result before implementation: the new state assertions fail because the fields are absent.

- [ ] **Step 4: Implement the state extension.**

Use this shape in `bolt.types.ts` and `dadosBoltIniciais()`:

```ts
numero: string | null;
email: string | null;
```

and initialize both values to `null` without changing the existing status enum.

- [ ] **Step 5: Re-run the focused test.**

Run `npm test -w apps/backend -- --test-name-pattern="Bolt|estado"` and expect PASS.

### Task 2: Replace menu qualification with natural conversation

**Files:**
- Modify: `apps/backend/src/modules/whatsapp/bolt/bolt.rules.ts`
- Test: `apps/backend/src/modules/whatsapp/whatsapp.service.spec.ts`

- [ ] **Step 1: Write failing conversation tests.**

Cover these exact transitions:

```ts
const inicio = bolt.processar({ texto: "Oi" }, null);
assert.match(inicio.texto, /Move/);
assert.match(inicio.texto, /como posso te chamar/i);
assert.equal(inicio.opcoes, undefined);

const nome = bolt.processar({ texto: "Fábio Dias" }, inicio.dados);
assert.match(nome.texto, /Como podemos ajudar/i);

const problema = bolt.processar({ texto: "Meu ar parou de gelar" }, nome.dados);
assert.match(problema.texto, /pena/i);
assert.match(problema.texto, /CEP/i);

const instalacao = bolt.processar({ texto: "Quero instalar um ar novo" }, nome.dados);
assert.doesNotMatch(instalacao.texto, /pena/i);
```

Also assert that no result in this flow includes `opcoes` or the old “Ver serviços” menu.

- [ ] **Step 2: Run the test and confirm failure.**

Run `npm test -w apps/backend -- --test-name-pattern="conversa natural|instalação|problema"`.

Expected result: FAIL because the current implementation returns the five-option menu and does not collect a full name before the service description.

- [ ] **Step 3: Implement the natural entry state.**

Use a welcome response with no options:

```ts
const WELCOME = "Olá! Eu sou o Move, da AIRMOVEBR. Como posso te chamar?";
```

Greetings reset the state to `BOT_QUALIFYING` with `etapa_atual: "aguardando_nome"`. The next free-text message stores the trimmed full name and asks: `Prazer, [nome]. Como podemos ajudar? Pode me contar com suas palavras.`

- [ ] **Step 4: Implement free-text service inference and tone.**

Infer `instalacao`, `pmoc`, `locacao`, or `manutencao` from text keywords; default unknown service descriptions to `manutencao`. Store the full description in `detalhes`. Use a problem response containing “Puxa, que pena. Mas estamos aqui para ajudar.” only for maintenance/problem language. Use a neutral response for installation, PMOC, or rental. Then ask only for the CEP.

- [ ] **Step 5: Remove menu/options from the default flow.**

Delete the five-item `MENU_OPTIONS`, installation options, maintenance options, and option-based branches. Keep keyword fallback to human transfer, but never require a button or present “Ver serviços”. Keep `corrigir` available to restart the data collection.

- [ ] **Step 6: Re-run natural-flow tests.**

Run `npm test -w apps/backend -- --test-name-pattern="conversa natural|instalação|problema"` and expect PASS.

### Task 3: Collect CEP, number, and e-mail one at a time

**Files:**
- Modify: `apps/backend/src/modules/whatsapp/bolt/bolt.rules.ts`
- Modify: `apps/backend/src/modules/whatsapp/whatsapp.service.ts`
- Test: `apps/backend/src/modules/whatsapp/whatsapp.service.spec.ts`

- [ ] **Step 1: Add failing sequential collection tests.**

Assert that after the problem response the bot asks only for CEP; after `cep_confirmar` it asks only for the address number; after `42` it asks only for e-mail; after a valid e-mail it returns `HUMAN_QUEUE` and the final handoff text. Assert that `numero` and `email` are stored in `resultado.dados`.

- [ ] **Step 2: Implement the address-number step.**

After CEP confirmation, set `etapa_atual: "aguardando_numero"` and reply `Qual é o número do endereço?`. Accept a non-empty trimmed string, store it as `numero`, and ask `Qual é o seu e-mail?`.

- [ ] **Step 3: Implement e-mail validation.**

While `etapa_atual === "aguardando_email"`, accept only a simple e-mail shape such as `/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/`. For invalid input reply only `Por favor, informe um e-mail válido.` and keep the same step. For valid input, store lowercase trimmed e-mail and call the final handoff result.

- [ ] **Step 4: Preserve CEP lookup and make it advance to number.**

Keep `responderComCep()` responsible for ViaCEP lookup and address confirmation. Change `proximaEtapa()` so all service types advance to `aguardando_numero` after confirmation. Do not ask number and e-mail in the same message.

- [ ] **Step 5: Add the business-hours handoff message.**

Add a helper using `Intl.DateTimeFormat` with `timeZone: "America/Sao_Paulo"`, weekday, hour, and minute. Treat Monday-Friday from 08:00 inclusive through 18:00 exclusive as commercial hours. Outside that range, use:

```text
Nosso horário de atendimento é de segunda a sexta, das 08:00 às 18:00. Mas já registrei tudo por aqui. Nossos especialistas entrarão em contato o mais rápido possível.
```

During hours, use the normal specialist-transfer text. Both paths must end in `HUMAN_QUEUE`.

- [ ] **Step 6: Re-run the sequential and hours tests.**

Run `npm test -w apps/backend -- --test-name-pattern="CEP|e-mail|horário|handoff"` and expect PASS.

### Task 4: Save the collected data and make CPF optional

**Files:**
- Modify: `apps/backend/src/modules/whatsapp/whatsapp.service.ts`
- Modify: `apps/backend/src/modules/admin/services/admin-clientes.service.ts`
- Modify: `apps/admin/index.html`
- Test: `apps/backend/src/modules/whatsapp/whatsapp.service.spec.ts`
- Test: `apps/backend/src/modules/admin/services/admin-clientes.service.spec.ts`

- [ ] **Step 1: Add a failing client-creation test.**

Call `criarClienteDaConversa()` with `nome`, `telefone`, `email`, `logradouro`, `numero`, `bairro`, `cidade`, `uf`, and `cep`, without `documento`; assert that the delegated admin DTO contains all fields and no CPF requirement is raised.

- [ ] **Step 2: Make document normalization nullable.**

Change `normalizarDocumento()` to return `null` for an empty optional document. Preserve CNPJ validation when `tipo === "pj"`, and preserve supplied PF document values. Store `documento: null` in `montarClienteData()` when omitted. Existing callers that require a document must enforce that requirement at their own UI/business boundary; the WhatsApp flow must not invent a CPF.

- [ ] **Step 3: Pass conversation fields into client creation.**

In `criarClienteDaConversa()`, merge the saved `BoltData` values into the DTO only when the UI did not override them:

```ts
const dados = normalizarDadosBolt(conversa.dados);
const cliente = await this.adminService.criarCliente({
  ...dto,
  nome: dto.nome || dados.nome || conversa.nomeContato || "Cliente",
  email: dto.email || dados.email || undefined,
  numero: dto.numero || dados.numero || undefined,
  telefone: dto.telefone || conversa.telefone,
  logradouro: dto.logradouro || dados.logradouro || undefined,
  bairro: dto.bairro || dados.bairro || undefined,
  cidade: dto.cidade || dados.cidade || undefined,
  uf: dto.uf || dados.uf || undefined,
  cep: dto.cep || dados.cep || undefined
}, usuario);
```

- [ ] **Step 4: Ensure the admin WhatsApp form accepts international phone length.**

Add `maxlength="14"` and `inputmode="tel"` to the WhatsApp client phone input if missing. The backend must continue accepting 10–14 digits after mask removal, including the incoming `55` prefix.

- [ ] **Step 5: Run client tests.**

Run `npm test -w apps/backend -- --test-name-pattern="criar cliente pelo WhatsApp|documento|telefone"` and expect PASS.

### Task 5: Run the complete backend verification

**Files:**
- Modify: `apps/backend/src/modules/whatsapp/whatsapp.service.spec.ts`
- Modify: `apps/backend/src/modules/admin/services/admin-clientes.service.spec.ts`

- [ ] **Step 1: Run the WhatsApp unit tests.**

Run `npm test -w apps/backend -- --test-name-pattern="WhatsApp|Bolt|cliente pelo WhatsApp"`.

- [ ] **Step 2: Run the backend test suite.**

Run `npm run backend:test`.

- [ ] **Step 3: Build the backend.**

Run `npm run backend:build` and expect a successful NestJS compilation.

- [ ] **Step 4: Run frontend contract tests.**

Run `npm run frontend:test` to ensure the admin form change does not break the panel contract.

- [ ] **Step 5: Commit the implementation.**

Run:

```bash
git add apps/backend/src/modules/whatsapp/bolt/bolt.types.ts apps/backend/src/modules/whatsapp/bolt/bolt.rules.ts apps/backend/src/modules/whatsapp/whatsapp.service.ts apps/backend/src/modules/admin/services/admin-clientes.service.ts apps/backend/src/modules/whatsapp/whatsapp.service.spec.ts apps/backend/src/modules/admin/services/admin-clientes.service.spec.ts apps/admin/index.html
git commit -m "feat: tornar atendimento WhatsApp natural"
```

### Task 6: Publish and verify the backend behavior

**Files:**
- Inspect: `docs/implantacao-producao.md`
- Inspect: `infra/docker-compose.prod.example.yml`

- [ ] **Step 1: Verify the target deployment command.**

Use the documented production deployment path from `docs/implantacao-producao.md`; do not change secrets or production configuration in this task.

- [ ] **Step 2: Publish the backend image or service.**

Deploy the commit containing the backend changes and restart the API service/container so the running process loads the new `BoltRules` implementation.

- [ ] **Step 3: Verify API health.**

Run:

```powershell
Invoke-WebRequest -UseBasicParsing https://api.airmovebr.com.br/api/v1/health
```

Expected: HTTP 200 and JSON with `"status":"ok"`.

- [ ] **Step 4: Run a fresh WhatsApp test.**

Use a new conversation or re-open the existing conversation in the admin panel so its `dados` state resets. Send `Oi` and verify the first response asks the customer’s name without “Ver serviços”. Continue with name, free-text problem/installation, CEP, number, and e-mail; verify the final handoff message and the client fields in the admin panel.

- [ ] **Step 5: Verify off-hours behavior.**

Run the same sequence outside Monday-Friday 08:00–18:00 in `America/Sao_Paulo` and confirm the response includes the business hours and says the data was registered for specialist follow-up.
