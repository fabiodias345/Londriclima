# Fase L1 — Levantamentos técnicos web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que uma manutenção do WhatsApp seja agendada como levantamento técnico com agenda real, sem gerar orçamento de reparo antes do diagnóstico.

**Architecture:** Um modelo próprio de levantamento preservará origem, cliente, conversa, problema, agenda e rastreio das notificações ao técnico. O módulo WhatsApp reutilizará a consulta e a validação de disponibilidade já usadas em O.S., criando levantamento em vez de O.S. de execução. A central web exibirá a agenda, a confirmação ao cliente e o estado dos avisos; um serviço agendado disparará o lembrete uma hora antes. Orçamento, diagnóstico em campo e app técnico permanecem para fases posteriores.

**Tech Stack:** NestJS, Prisma/PostgreSQL, TypeScript, módulo WhatsApp existente, JavaScript modular do Admin e `node:test`.

---

## Mapa de arquivos

- Modify: `apps/backend/prisma/schema.prisma` — enum, modelo e relações de levantamento.
- Create: `apps/backend/prisma/migrations/<timestamp>_levantamentos_tecnicos/migration.sql` — tabelas e índices da Fase L1.
- Create: `apps/backend/src/modules/levantamentos/levantamentos.service.ts` — criação, listagem, detalhe e agenda do levantamento.
- Create: `apps/backend/src/modules/levantamentos/levantamentos.controller.ts` — endpoints administrativos autenticados.
- Create: `apps/backend/src/modules/levantamentos/levantamentos.module.ts` — módulo isolado.
- Create: `apps/backend/src/modules/levantamentos/dto/levantamentos.dto.ts` — DTO de criação/agendamento.
- Create: `apps/backend/src/modules/levantamentos/levantamentos.service.spec.ts` — testes de isolamento e conflito de agenda.
- Create: `apps/backend/src/modules/levantamentos/levantamentos-notificacao.service.ts` — envio idempotente de aviso, alteração/cancelamento e lembrete ao técnico.
- Create: `apps/backend/src/modules/levantamentos/levantamentos-notificacao.service.spec.ts` — testes de entrega, erro e lembrete único.
- Create: `apps/backend/src/modules/levantamentos/levantamentos-lembrete.scheduler.ts` — varredura periódica dos lembretes de uma hora.
- Modify: `apps/backend/src/modules/whatsapp/whatsapp.module.ts` — importar o módulo de levantamentos.
- Modify: `apps/backend/src/modules/whatsapp/whatsapp.service.ts` — expor levantamento na conversa, criar/agendar e usar disponibilidade real.
- Modify: `apps/backend/src/modules/whatsapp/whatsapp-admin.controller.ts` — endpoints da conversa para levantamento.
- Modify: `apps/admin/js/modules/whatsapp.js` — bloco de levantamento, calendário/horários e confirmação editável ao cliente.
- Modify: `apps/admin/js/modules/comercial.js` — reservar o ponto de entrada da aba Levantamentos, sem fluxo de orçamento nesta fase.
- Modify: `tests/frontend-contracts.test.js` — contratos da agenda e levantamento no atendimento.
- Modify: `docs/resumo.md` — checkpoint da Fase L1.

Não modificar `apps/admin_mobile`, `apps/mobile`, Flutter, APK, PMOC, criação de orçamento pós-diagnóstico ou cobrança de visita nesta fase.

### Task 1: Persistir o levantamento e seus estados

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/<timestamp>_levantamentos_tecnicos/migration.sql`

- [ ] **Step 1: Escrever o enum e o modelo Prisma**

Adicionar `LevantamentoStatus` com `pendente_agendamento`, `agendado`, `em_levantamento`, `diagnostico_concluido`, `resolvido_na_visita` e `cancelado`; criar `LevantamentoTecnico` com empresa, cliente, conversa opcional, equipe/técnico opcionais, problema, data agendada, status e timestamps.

```prisma
model LevantamentoTecnico {
  id             String @id @default(uuid()) @db.Uuid
  empresaId      String @map("empresa_id") @db.Uuid
  clienteId      String @map("cliente_id") @db.Uuid
  conversaId     String? @unique @map("conversa_id") @db.Uuid
  equipeId       String? @map("equipe_id") @db.Uuid
  tecnicoId      String? @map("tecnico_id") @db.Uuid
  problema       String
  agendadaPara   DateTime? @map("agendada_para")
  status         LevantamentoStatus @default(pendente_agendamento)
  criadoEm       DateTime @default(now()) @map("criado_em")
  tecnicoAvisadoEm DateTime? @map("tecnico_avisado_em")
  lembreteTecnicoEm DateTime? @map("lembrete_tecnico_em")
  notificacaoErro String? @map("notificacao_erro")
  atualizadoEm   DateTime @updatedAt @map("atualizado_em")
  @@index([empresaId, status, agendadaPara])
}
```

- [ ] **Step 2: Gerar migration e client Prisma**

Run: `npm.cmd run backend:prisma:generate` e `npx.cmd prisma migrate dev --name levantamentos_tecnicos` em `apps/backend`.

Expected: migration criada, client gerado e schema válido.

- [ ] **Step 3: Build de segurança**

Run: `npm.cmd run backend:build` na raiz.

Expected: build sem tipos Prisma obsoletos.

- [ ] **Step 4: Commitar a persistência**

```powershell
git add apps/backend/prisma
git commit -m "feat: adicionar levantamentos tecnicos"
```

### Task 2: Implementar serviço e API administrativa

**Files:**
- Create: `apps/backend/src/modules/levantamentos/levantamentos.service.ts`
- Create: `apps/backend/src/modules/levantamentos/levantamentos.controller.ts`
- Create: `apps/backend/src/modules/levantamentos/levantamentos.module.ts`
- Create: `apps/backend/src/modules/levantamentos/dto/levantamentos.dto.ts`
- Create: `apps/backend/src/modules/levantamentos/levantamentos.service.spec.ts`

- [ ] **Step 1: Escrever testes de criação e conflito**

Cobrir empresa isolada, criação em `pendente_agendamento`, agendamento com equipe/técnico e bloqueio de horário ocupado por O.S. aberta, em deslocamento ou em atendimento.

```ts
await assert.rejects(
  () => service.agendar("levantamento-1", "empresa-1", { equipe_id: "equipe-1", agendada_para: "2026-07-27T10:00:00" }),
  /horario ja esta ocupado/i
);
```

- [ ] **Step 2: Rodar o spec para confirmar a falha inicial**

Run: `node.exe --test -r ts-node/register "src/modules/levantamentos/levantamentos.service.spec.ts"` em `apps/backend`.

Expected: FAIL antes da implementação do módulo.

- [ ] **Step 3: Implementar serviço isolado**

Criar `criar`, `listar`, `obter` e `agendar`. `agendar` valida empresa, data, equipe/técnico e consulta `ordemServico` com a mesma condição de conflito do fluxo WhatsApp atual.

```ts
where: {
  empresaId,
  status: { in: [OrdemServicoStatus.aberta, OrdemServicoStatus.em_deslocamento, OrdemServicoStatus.em_atendimento] },
  agendadaPara: horario,
  OR: [...(dto.equipe_id ? [{ equipeId: dto.equipe_id }] : []), ...(dto.tecnico_id ? [{ tecnicoId: dto.tecnico_id }] : [])]
}
```

- [ ] **Step 4: Expor endpoints admin**

Criar `GET /admin/levantamentos`, `GET /admin/levantamentos/:id`, `POST /admin/levantamentos` e `PATCH /admin/levantamentos/:id/agendar`, todos com `JwtAuthGuard`, `AdminRoleGuard` e `empresa_id` do usuário autenticado.

- [ ] **Step 5: Rodar testes e build**

Run: spec do passo 2 e `npm.cmd run backend:build` na raiz.

Expected: testes e build aprovados.

- [ ] **Step 6: Commitar o módulo**

```powershell
git add apps/backend/src/modules/levantamentos
git commit -m "feat: criar API de levantamentos tecnicos"
```

### Task 3: Integrar levantamento à conversa WhatsApp

**Files:**
- Modify: `apps/backend/src/modules/whatsapp/whatsapp.module.ts`
- Modify: `apps/backend/src/modules/whatsapp/whatsapp.service.ts`
- Modify: `apps/backend/src/modules/whatsapp/whatsapp-admin.controller.ts`
- Modify: `apps/backend/src/modules/whatsapp/whatsapp.service.spec.ts`

- [ ] **Step 1: Escrever testes de conversa de manutenção**

Cobrir criação de levantamento apenas com cliente vinculado, problema vindo de `atendimento.dados.detalhes`, retorno no detalhe da conversa e agendamento sem criar `ordemServico`.

- [ ] **Step 2: Implementar endpoints da conversa**

Adicionar `POST /admin/whatsapp/conversas/:id/levantamento` e `PATCH /admin/whatsapp/conversas/:id/levantamento/agendar`. Eles usam o cliente/conversa existentes e delegam ao módulo de levantamentos.

- [ ] **Step 3: Entregar levantamento no detalhe da conversa**

Estender `obterConversa` para incluir o levantamento atual com estado, agenda, equipe e técnico. Não criar orçamento nem O.S. nessa operação.

- [ ] **Step 4: Validar o fluxo direcionado**

Run: `node.exe --test -r ts-node/register "src/modules/whatsapp/whatsapp.service.spec.ts"` em `apps/backend`.

Expected: testes existentes e novos aprovados.

- [ ] **Step 5: Commitar a integração WhatsApp**

```powershell
git add apps/backend/src/modules/whatsapp
git commit -m "feat: criar levantamento pela conversa WhatsApp"
```

### Task 4: Avisar o técnico e lembrar uma hora antes

**Files:**
- Create: `apps/backend/src/modules/levantamentos/levantamentos-notificacao.service.ts`
- Create: `apps/backend/src/modules/levantamentos/levantamentos-notificacao.service.spec.ts`
- Create: `apps/backend/src/modules/levantamentos/levantamentos-lembrete.scheduler.ts`
- Modify: `apps/backend/src/modules/levantamentos/levantamentos.module.ts`
- Modify: `apps/backend/src/modules/levantamentos/levantamentos.service.ts`

- [ ] **Step 1: Escrever testes de aviso e lembrete**

Cobrir: confirmação envia template ao telefone do técnico; reagendamento envia atualização; cancelamento envia cancelamento; falha persiste a descrição sem cancelar o levantamento; lembrete é enviado apenas uma vez quando faltam entre 55 e 65 minutos.

```ts
await notificacaoService.enviarLembretesPendentes();
assert.equal(sender.enviarTemplate.mock.callCount(), 1);
assert.ok(levantamento.lembreteTecnicoEm);
```

- [ ] **Step 2: Implementar o envio idempotente**

Usar `WhatsAppSender.enviarTemplate`, telefones normalizados e `WHATSAPP_TEMPLATE_LANGUAGE`. Criar três chaves de configuração sem valores fixos: `WHATSAPP_TEMPLATE_LEVANTAMENTO_AGENDADO`, `WHATSAPP_TEMPLATE_LEVANTAMENTO_ALTERADO` e `WHATSAPP_TEMPLATE_LEVANTAMENTO_CANCELADO`. Os parâmetros incluem nome do técnico, cliente, endereço, data/hora e problema. Persistir data de êxito; persistir o erro legível quando falhar para que o atendimento possa reenviar sem recriar o levantamento.

- [ ] **Step 3: Implementar lembrete de uma hora**

Criar scheduler com o padrão de ciclo de vida já usado no Admin. A cada cinco minutos, buscar somente levantamentos `agendado`, futuros, sem `lembreteTecnicoEm`, cujo horário esteja entre 55 e 65 minutos à frente. Enviar o template `WHATSAPP_TEMPLATE_LEVANTAMENTO_LEMBRETE`; ao êxito, preencher `lembreteTecnicoEm`; ao erro, registrar `notificacaoErro` e deixar elegível à nova tentativa no próximo ciclo.

- [ ] **Step 4: Vincular à agenda e expor reenvio**

Depois de agendar com sucesso, chamar o aviso de confirmação. Em mudança de data/hora, enviar alteração; em cancelamento, enviar cancelamento. Expor `POST /admin/levantamentos/:id/notificacao/reenviar`, autorizado para a empresa, e retornar `notificacao_erro`, `tecnico_avisado_em` e `lembrete_tecnico_em` no detalhe.

- [ ] **Step 5: Rodar testes e build**

Run: `node.exe --test -r ts-node/register "src/modules/levantamentos/levantamentos-notificacao.service.spec.ts"` em `apps/backend` e `npm.cmd run backend:build` na raiz.

Expected: entrega idempotente, lembrete único, falhas rastreáveis e build aprovados.

- [ ] **Step 6: Commitar os avisos ao técnico**

```powershell
git add apps/backend/src/modules/levantamentos apps/backend/prisma
git commit -m "feat: avisar tecnico sobre levantamentos"
```

### Task 5: Exibir agenda e confirmar levantamento no painel web

**Files:**
- Modify: `apps/admin/js/modules/whatsapp.js`
- Modify: `apps/admin/js/modules/comercial.js`
- Modify: `tests/frontend-contracts.test.js`

- [ ] **Step 1: Adicionar contratos frontend**

Validar que a central contém `Levantamento técnico`, campos de equipe/técnico, calendário, horários e endpoints de levantamento.

- [ ] **Step 2: Renderizar o bloco antes do orçamento**

Para conversa de manutenção sem levantamento agendado, renderizar resumo do problema, seleção de equipe/técnico e a agenda já carregada por `loadWhatsappScheduleOptions`.

- [ ] **Step 3: Confirmar levantamento e mensagem ao cliente**

Ao escolher horário livre, preencher a mensagem editável aprovada e chamar o endpoint de agendamento. A confirmação deve ocorrer somente após resposta de sucesso da API.

- [ ] **Step 4: Mostrar estado de aviso e permitir reenvio**

No detalhe do levantamento, apresentar data do aviso e do lembrete. Se a API devolver `notificacao_erro`, mostrar erro operacional e a ação `Reenviar aviso ao técnico`; a falha de WhatsApp nunca deve remover a agenda confirmada.

- [ ] **Step 5: Criar entrada de aba Levantamentos**

Adicionar a navegação e listagem simples da nova aba no painel web, consumindo `GET /admin/levantamentos`; manter orçamento pós-diagnóstico fora desta fase.

- [ ] **Step 6: Executar testes frontend**

Run: `node.exe --check apps/admin/js/modules/whatsapp.js` e `npm.cmd run frontend:test` na raiz.

Expected: sintaxe válida e contratos aprovados.

- [ ] **Step 7: Commitar a interface L1**

```powershell
git add apps/admin/js/modules/whatsapp.js apps/admin/js/modules/comercial.js tests/frontend-contracts.test.js
git commit -m "feat: agendar levantamentos no painel web"
```

### Task 6: Validação e checkpoint da Fase L1

**Files:**
- Modify: `docs/resumo.md`

- [ ] **Step 1: Rodar validações completas**

Run: `npm.cmd run backend:prisma:generate`, `npm.cmd run backend:build`, `npm.cmd run backend:test`, `npm.cmd run frontend:test` e `git diff --check` na raiz.

Expected: todas as suítes aprovadas; qualquer log conhecido sem falha deve ser registrado no checkpoint.

- [ ] **Step 2: Validar manualmente a agenda**

No Admin: abrir conversa de manutenção, criar levantamento, selecionar equipe/técnico, confirmar horário livre e tentar horário ocupado. Esperado: o primeiro agenda e deixa o aviso ao técnico pendente/enviado visível; o segundo mostra conflito sem criar O.S. de execução. Reagendar/cancelar deve criar o respectivo aviso sem apagar o registro.

- [ ] **Step 3: Atualizar resumo e commit final**

Registrar Fase L1 concluída e o próximo foco (diagnóstico em campo, orçamento pela atendente e cobrança de visita) em `docs/resumo.md`.

```powershell
git add docs/resumo.md
git commit -m "docs: concluir fase L1 de levantamentos"
```

## Revisão do plano

- **Cobertura:** persistência, API, agenda, conflito, conversa WhatsApp, avisos ao técnico, lembrete de uma hora, painel web e validações da Fase L1 estão cobertos.
- **Escopo:** diagnóstico de campo, orçamento pós-levantamento, cobrança de visita e app técnico ficam explicitamente para as próximas fases.
- **Consistência:** nenhuma tarefa cria O.S. de execução nem orçamento antes de diagnóstico concluído.
