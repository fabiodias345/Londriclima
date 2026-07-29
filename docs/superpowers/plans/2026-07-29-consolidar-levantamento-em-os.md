# Consolidar Levantamento Técnico em O.S. Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar levantamento técnico em uma O.S. comum com tipo `levantamento_tecnico`, removendo a tela separada do painel sem perder histórico, laudo, fotos, autorização ou integração com o APK.

**Architecture:** A O.S. será o registro operacional único para agenda, técnico, checklist, fotos, assinatura e status. Os dados específicos do levantamento serão incorporados à O.S. ou a tabelas filhas vinculadas diretamente à O.S.; a tabela antiga `LevantamentoTecnico` será migrada, mantida temporariamente para compatibilidade e removida somente depois da validação.

**Tech Stack:** Prisma/PostgreSQL, NestJS, painel administrativo em JavaScript, Flutter APK, APIs REST.

---

### Task 1: Definir o modelo de O.S. para levantamento

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/<timestamp>_levantamento_como_os/migration.sql`
- Modify: `apps/backend/src/database/schema-categoria-servico.spec.ts`

- [ ] **Step 1: Adicionar `levantamento_tecnico` ao enum de serviço da O.S.**

O enum `OrdemServicoTipoServico` passará a conter `preventiva`, `corretiva`, `instalacao` e `levantamento_tecnico`.

- [ ] **Step 2: Definir os campos específicos necessários**

Adicionar à O.S. os campos que hoje pertencem diretamente ao levantamento: problema relatado, diagnóstico, causa provável, serviços recomendados, observações, decisão, status do laudo e datas de finalização/reabertura. Dados repetitivos, como itens, fotos e autorizações, devem virar tabelas filhas com `ordemServicoId`.

- [ ] **Step 3: Criar a relação da conversa diretamente com a O.S.**

Manter `WhatsAppConversa.ordemServicoId` como vínculo oficial. O levantamento não deve continuar sendo o registro usado para localizar a O.S. da conversa.

- [ ] **Step 4: Criar migração reversível de estrutura**

Adicionar colunas/tabelas e índices sem apagar `levantamentos_tecnicos`. A migração de dados será uma etapa separada, permitindo rollback antes da remoção definitiva.

### Task 2: Migrar levantamentos existentes para O.S.

**Files:**
- Create: `apps/backend/prisma/migrations/<timestamp>_migrar_levantamentos_para_os/migration.sql`
- Modify: `apps/backend/src/modules/levantamentos/levantamentos.service.ts`
- Modify: `apps/backend/src/modules/levantamentos/levantamentos-tecnico.service.ts`

- [ ] **Step 1: Criar uma O.S. para cada levantamento sem O.S. correspondente**

Usar a mesma empresa, cliente, equipe, técnico, data, problema e status operacional. Definir `tipoServico = levantamento_tecnico`, `origem = servico_gratuito` e título `Levantamento técnico - <cliente>`.

- [ ] **Step 2: Copiar dados específicos e relações filhas**

Migrar diagnóstico, causa provável, serviços recomendados, observações, itens técnicos, fotos e autorização, preservando os IDs de origem em uma coluna de rastreabilidade ou tabela de migração.

- [ ] **Step 3: Vincular a conversa à nova O.S.**

Para cada levantamento com `conversaId`, atualizar `WhatsAppConversa.ordemServicoId` com a O.S. criada. Não substituir conversas que já tenham uma O.S. válida sem conferir a correspondência de cliente e empresa.

- [ ] **Step 4: Tornar a migração idempotente**

Executar novamente sem duplicar O.S.; usar a relação de conversa e uma chave de origem para localizar registros já migrados.

### Task 3: Fazer o WhatsApp criar e agendar O.S.

**Files:**
- Modify: `apps/backend/src/modules/whatsapp/whatsapp.service.ts`
- Modify: `apps/backend/src/modules/whatsapp/whatsapp-admin.controller.ts`
- Modify: `apps/backend/src/modules/levantamentos/levantamentos.service.ts`
- Modify: `apps/backend/src/modules/levantamentos/levantamentos-notificacao.service.ts`
- Test: `apps/backend/src/modules/whatsapp/whatsapp.service.spec.ts`

- [ ] **Step 1: Substituir `criarLevantamentoDaConversa` por criação de O.S.**

Criar uma O.S. `levantamento_tecnico` usando o cliente, conversa, problema e dados comerciais já coletados. Retornar a O.S. e manter, durante a transição, um objeto de compatibilidade chamado `levantamento` apontando para ela.

- [ ] **Step 2: Substituir `agendarLevantamentoDaConversa` por agendamento de O.S.**

Reutilizar a validação de conflito da agenda de O.S., atualizar técnico/equipe/data/status na mesma transação e enviar confirmação pelo WhatsApp.

- [ ] **Step 3: Corrigir a confirmação ao cliente**

Usar o nome do técnico selecionado, data, horário e a mensagem obrigatória de que um adulto responsável deve estar no local. Em reagendamento, enviar a nova data e horário sem criar outro registro.

- [ ] **Step 4: Preservar endpoints antigos durante a transição**

Manter temporariamente as rotas `/admin/levantamentos` como adaptadores para a O.S., evitando quebrar o painel atual até a troca do frontend.

### Task 4: Integrar O.S. de levantamento ao APK

**Files:**
- Modify: `apps/backend/src/modules/mobile/mobile.service.ts`
- Modify: `apps/backend/src/modules/mobile/mobile-checklists.ts`
- Modify: `apps/mobile/lib/src/repositories/api_work_order_repository.dart`
- Modify: telas de O.S. do APK localizadas no fluxo de ordens de serviço
- Test: `apps/backend/src/modules/mobile/mobile.service.spec.ts`
- Test: `apps/mobile/test/api_work_order_repository_test.dart`

- [ ] **Step 1: Expor `levantamento_tecnico` no payload de O.S.**

O APK deve receber o mesmo objeto de ordem, com `tipo_servico = levantamento_tecnico`, técnico/equipe, cliente, endereço e horário.

- [ ] **Step 2: Definir o checklist específico**

O tipo levantamento deve abrir checklist de diagnóstico, fotos antes/depois quando aplicável, observações, conclusão e assinatura, sem cair automaticamente no checklist preventivo mensal.

- [ ] **Step 3: Preservar o laudo técnico**

As respostas, itens, fotos e decisão do levantamento devem ser salvos vinculados à O.S. e continuar disponíveis para o painel e relatórios.

- [ ] **Step 4: Validar sincronização offline**

Garantir que o tipo novo seja preservado no envio e reenvio da fila offline, sem conversão para `preventiva` ou `corretiva`.

### Task 5: Remover a tela separada do painel

**Files:**
- Modify: `apps/admin/js/modules/comercial.js`
- Modify: `apps/admin/js/modules/agenda.js`
- Modify: `apps/admin/js/modules/eventos.js`
- Modify: módulos de O.S. e filtros do painel que exibem `tipo_servico`
- Modify: estilos somente se ficarem seletores órfãos

- [ ] **Step 1: Remover o item “Levantamentos” da navegação**

Remover `levantamentosNav`, `levantamentosView`, carregamento e ações de apagar da tela comercial.

- [ ] **Step 2: Exibir levantamentos em O.S.**

Adicionar filtro/etiqueta `Levantamento técnico` na listagem de O.S. e na agenda, usando o endpoint já existente de ordens.

- [ ] **Step 3: Ajustar ações da agenda**

Editar, reagendar e cancelar uma O.S. de levantamento pelas mesmas ações das demais O.S., sem chamar endpoints separados de levantamento.

- [ ] **Step 4: Manter links históricos temporariamente**

Se existir URL antiga de levantamento, redirecionar para a O.S. correspondente durante a migração; não apagar dados apenas por remover o menu.

### Task 6: Encerrar a estrutura antiga com segurança

**Files:**
- Modify: `apps/backend/src/modules/levantamentos/levantamentos.module.ts`
- Modify: `apps/backend/src/modules/levantamentos/levantamentos.controller.ts`
- Modify: `apps/backend/src/modules/admin/services/admin-agenda.service.ts`
- Create: migração final somente após validação em produção

- [ ] **Step 1: Parar de consultar `LevantamentoTecnico` na agenda**

Remover o segundo ramo que mistura ordens e levantamentos na agenda; a agenda deve listar apenas O.S.

- [ ] **Step 2: Desativar criação duplicada**

Fazer as rotas antigas retornarem a O.S. correspondente ou uma resposta de compatibilidade, sem inserir novos registros em `levantamentos_tecnicos`.

- [ ] **Step 3: Conferir contagens e vínculos**

Comparar quantidade de levantamentos antigos, O.S. criadas, conversas vinculadas, fotos, itens, autorizações e registros enviados ao APK antes de remover a tabela antiga.

- [ ] **Step 4: Remover a tabela somente em uma etapa posterior**

Após validar produção e concluir a migração, remover controllers, serviços, modelos e tabelas antigas em uma migração separada. A remoção não faz parte do primeiro deploy.

## Ordem recomendada

1. Criar o tipo e a estrutura de O.S.
2. Migrar dados antigos sem apagar a estrutura original.
3. Fazer WhatsApp criar/agendar O.S.
4. Integrar o tipo ao APK.
5. Remover a tela “Levantamentos” e usar filtro em O.S.
6. Monitorar produção.
7. Remover a estrutura antiga somente depois da confirmação.

## Decisão importante

Não apagar a tabela `LevantamentoTecnico` no primeiro momento. O menu pode ser removido, mas os dados, endpoints e serviços antigos devem permanecer como compatibilidade até que a migração seja comprovada.
