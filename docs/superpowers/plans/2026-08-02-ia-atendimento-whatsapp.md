# IA principal no atendimento WhatsApp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Usar a IA como decisora principal do atendimento WhatsApp, com busca de CEP por rua/cidade/UF e fallback integral para o BOLT.

**Architecture:** O webhook continuará persistindo entradas e usando `WhatsAppCloudService` para envio. `IaService` analisará cada mensagem com saída JSON estruturada; `WhatsAppService` validará a ação, atualizará o estado e executará apenas busca de CEP ou continuidade permitidas. O BOLT será usado somente quando a IA estiver indisponível ou retornar formato inválido.

**Tech Stack:** NestJS, TypeScript, Prisma, OpenAI Responses API, ViaCEP, WhatsApp Cloud API.

---

### Task 1: Contrato e análise de atendimento pela IA

**Files:**
- Modify: `apps/backend/src/modules/ia/ia.types.ts`
- Modify: `apps/backend/src/modules/ia/ia.service.ts`

- [ ] **Step 1: Definir os tipos de intenção, ação, dados e resultado estruturado.**
- [ ] **Step 2: Criar `analisarAtendimentoWhatsapp` com histórico, estado atual e mensagem atual no prompt.**
- [ ] **Step 3: Usar JSON Schema estrito, limitar a saída às ações permitidas e retornar `null` em falha para acionar fallback.**
- [ ] **Step 4: Validar localmente campos obrigatórios, ação e texto antes de devolver o resultado.**

### Task 2: Busca de CEP por endereço

**Files:**
- Modify: `apps/backend/src/modules/whatsapp/whatsapp.service.ts`

- [ ] **Step 1: Adicionar consulta ViaCEP por UF, cidade e logradouro com `encodeURIComponent`.**
- [ ] **Step 2: Tratar zero, um e vários resultados sem inventar endereço.**
- [ ] **Step 3: Perguntar cidade e UF quando ausentes e pedir confirmação para endereço encontrado.**
- [ ] **Step 4: Preservar consulta por CEP existente e o estado estruturado da conversa.**

### Task 3: Tornar a IA o fluxo principal do webhook

**Files:**
- Modify: `apps/backend/src/modules/whatsapp/whatsapp.service.ts`

- [ ] **Step 1: Executar a análise da IA antes do BOLT quando a conversa estiver no bot.**
- [ ] **Step 2: Aplicar os dados identificados ao estado `BoltData` e executar a ação permitida.**
- [ ] **Step 3: Enviar e persistir a resposta da IA pelo fluxo existente.**
- [ ] **Step 4: Usar o BOLT como fallback quando não houver resultado utilizável da IA.**
- [ ] **Step 5: Registrar fallback sem expor credenciais e preservar transferência humana.**

### Task 4: Publicação e verificação

**Files:**
- Commitar somente os arquivos da implementação e o plano.

- [ ] **Step 1: Conferir diff e status sem executar testes automatizados.**
- [ ] **Step 2: Fazer commit da implementação.**
- [ ] **Step 3: Publicar na branch de produção conforme o procedimento existente.**
- [ ] **Step 4: Recriar backend, confirmar variáveis sem exibir valores e verificar health público.**
- [ ] **Step 5: Conferir logs de inicialização e informar que o teste final de conversa depende de uma mensagem real do cliente.**
