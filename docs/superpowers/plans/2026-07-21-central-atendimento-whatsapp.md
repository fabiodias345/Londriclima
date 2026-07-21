# Central de Atendimento WhatsApp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o Admin WhatsApp em uma central operacional que preserve o histórico, exponha a qualificação do Bolt e crie uma O.S. vinculada sem redigitação.

**Architecture:** O endpoint de detalhe continuará sendo a fonte da conversa, mas passará a devolver uma visão de atendimento com dados Bolt normalizados e uma prévia de O.S. O Admin estático renderizará uma grade explícita de três áreas: fila, histórico/compositor e contexto/ações; o compositor só habilita para o atendente responsável.

**Tech Stack:** JavaScript ES modules, CSS, NestJS, Prisma, Node test runner.

---

### Task 1: Contrato da visão de atendimento

**Files:**
- Modify: `apps/backend/src/modules/whatsapp/whatsapp.service.ts`
- Test: `apps/backend/src/modules/whatsapp/whatsapp.service.spec.ts`

- [ ] **Step 1: Write failing test**

```ts
test("detalhe da conversa inclui dados Bolt e prévia de O.S.", async () => {
  // mock findFirstOrThrow com dados: { nome, cidade_bairro, servico, detalhes }
  // assert.equal(result.atendimento.dados.nome, "Fábio")
  // assert.match(result.atendimento.previaOs.detalhes, /Londrina/)
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- whatsapp.service.spec.ts`
Expected: FAIL porque `atendimento` ainda não existe.

- [ ] **Step 3: Implement minimal service mapping**

```ts
return { ...conversa, atendimento: {
  dados: normalizarDadosBolt(conversa.dados),
  previaOs: { titulo, detalhes, tipoServico }
} };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- whatsapp.service.spec.ts`
Expected: PASS.

### Task 2: Regras seguras de resposta e O.S.

**Files:**
- Modify: `apps/backend/src/modules/whatsapp/whatsapp.service.ts`
- Modify: `apps/backend/src/modules/whatsapp/whatsapp-admin.controller.ts`
- Test: `apps/backend/src/modules/whatsapp/whatsapp.service.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
// resposta de usuário não atribuído rejeita com ConflictException
// criar O.S. recebe título, detalhes e tipo derivados quando o formulário os omite
```

- [ ] **Step 2: Implement authorization and defaults**

Passar `usuario.id` para `responderConversa`; rejeitar a resposta se a conversa humana não estiver atribuída a esse usuário. Derivar `titulo`, `detalhes` e `tipo_servico` da prévia antes de chamar `criarOrdemAgenda`.

- [ ] **Step 3: Run focused tests**

Run: `npm test -- whatsapp.service.spec.ts`
Expected: PASS.

### Task 3: Central visual e fluxo de atendimento

**Files:**
- Modify: `apps/admin/js/modules/whatsapp.js`
- Modify: `apps/admin/css/layout.css`

- [ ] **Step 1: Render three-panel layout**

Renderizar fila, thread e painel contextual como elementos nomeados. Marcar o cartão selecionado e carregar a conversa selecionada ao atualizar a lista.

- [ ] **Step 2: Render history, extracted data and linked records**

Exibir todas as mensagens em ordem, direção, hora e status de entrega. Exibir os campos Bolt não vazios, cliente e O.S. vinculados.

- [ ] **Step 3: Gate reply and prefill O.S.**

Mostrar botão “Assumir atendimento” para a fila; ocultar/desabilitar o compositor até atribuição. Preencher o formulário de O.S. com a prévia retornada pela API.

- [ ] **Step 4: Add responsive CSS**

Adicionar `display: grid` à área de trabalho, colunas para desktop, alturas com rolagem independente e empilhamento para mobile. Estilizar mensagens de entrada/saída e os dados sem esconder ações.

### Task 4: Verification and handoff

**Files:**
- Modify: `docs/resumo.md`

- [ ] **Step 1: Check file-size constraint**

Run: `Get-ChildItem apps/admin/js/modules/whatsapp.js,apps/backend/src/modules/whatsapp/whatsapp.service.ts | Select Name,Length`
Expected: nenhum arquivo de código novo ou editado supera 500 linhas.

- [ ] **Step 2: Run backend suite and lint**

Run: `npm test; npm run lint`
Working directory: `apps/backend`
Expected: PASS.

- [ ] **Step 3: Manually validate Admin flow**

Abrir uma conversa pendente, confirmar todo o histórico e dados Bolt, assumir, responder, criar cliente e confirmar que a O.S. abre pré-preenchida e vinculada.

- [ ] **Step 4: Record result**

Atualizar `docs/resumo.md` com o estado verificado e limitações de produção, sem incluir credenciais.
