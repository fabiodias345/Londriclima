# Bot WhatsApp Simplificado Implementation Plan

> **For agentic workers:** Execute este plano tarefa por tarefa, mantendo o Copiloto Comercial manual separado do webhook automático.

**Goal:** Fazer o WhatsApp pedir somente nome e necessidade por botões, transferindo rapidamente para o atendente e removendo a IA do atendimento automático.

**Architecture:** O webhook chamará exclusivamente `BoltRules.processar`. O BOLT terá uma etapa curta de nome seguida por opções fixas; a IA continuará injetada apenas para os endpoints manuais do Copiloto Comercial.

**Tech Stack:** NestJS, TypeScript, Prisma, WhatsApp Cloud API e `BoltRules`.

---

### Task 1: Simplificar o BOLT

**Files:**
- Modify: `apps/backend/src/modules/whatsapp/bolt/bolt.rules.ts`
- Modify: `apps/backend/src/modules/whatsapp/bolt/bolt.types.ts` apenas se os IDs/opções exigirem ajuste de tipo

- [ ] Substituir o menu atual por opções `orcamento`, `instalacao`, `manutencao`, `agendar_visita` e `atendente`.
- [ ] Fazer saudação e primeira mensagem solicitarem apenas o nome completo.
- [ ] Ao receber o nome, salvar `dados.nome`, definir `etapa_atual: "aguardando_servico"` e enviar as cinco opções.
- [ ] Ao receber uma opção, salvar a necessidade em `dados.servico`/`campos_extra`, retornar confirmação curta e `assumir: true` com `status: "HUMAN_QUEUE"`.
- [ ] Para texto livre sem opção, preservar o texto em `detalhes` e transferir para atendimento humano sem solicitar CEP, endereço, e-mail ou dados técnicos.
- [ ] Manter os estados `HUMAN_ATTENDING` e `CLOSED` sem novas respostas automáticas.

### Task 2: Retirar IA do webhook automático

**Files:**
- Modify: `apps/backend/src/modules/whatsapp/whatsapp.service.ts`

- [ ] Remover a chamada a `processarComIa` dentro de `processarMensagemInterna`.
- [ ] Remover `humanizarResposta` do caminho automático.
- [ ] Usar diretamente `this.bolt.processar(...)`, mantendo `responderComCep` fora do fluxo automático.
- [ ] Preservar gravação da entrada, resposta, opções e transferência humana.
- [ ] Manter `IaService` disponível para `analisar` e `rascunho` do Copiloto Comercial.

### Task 3: Atualizar cobertura de comportamento

**Files:**
- Modify: `apps/backend/src/modules/whatsapp/whatsapp.service.spec.ts`

- [ ] Atualizar os cenários do BOLT que esperam CEP, e-mail ou qualificações técnicas para esperar apenas nome, opção e transferência.
- [ ] Manter a verificação de que a primeira mensagem contém saudação e pedido de nome.
- [ ] Verificar a ausência de chamada ao serviço de IA no webhook usando um stub que falharia se fosse invocado.

### Task 4: Verificação e entrega

**Files:**
- No additional files.

- [ ] Executar `npm.cmd run prisma:generate -w apps/backend` para alinhar o cliente local.
- [ ] Executar `npm.cmd run build -w apps/backend` e confirmar compilação sem erros.
- [ ] Revisar `git diff --check`.
- [ ] Commitar com `feat: simplificar bot de atendimento whatsapp`.
- [ ] Publicar em `dev`, promover para `main` e reconstruir a produção.
