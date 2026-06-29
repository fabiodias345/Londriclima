# Checklist Real e Seguranca da OS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Garantir que o APK operacional use somente os checklists do backend, corrigir a execucao anual e registrar a seguranca uma vez antes do inicio da OS.

**Architecture:** O backend continua como fonte unica dos checklists preventivos. O modo fake fica disponivel somente por flag explicita de demo. A seguranca e enviada junto da transicao `iniciar_atendimento`, validada e gravada de forma imutavel na OS; o app coleta os dados em um dialogo separado antes de iniciar.

**Tech Stack:** Flutter/Dart, NestJS/TypeScript, Prisma/PostgreSQL, Node Test Runner.

---

### Task 1: Checklist real e anual simples

**Files:**
- Modify: `apps/backend/src/modules/mobile/mobile-checklists.ts`
- Modify: `apps/backend/src/modules/mobile/mobile-checklists.spec.ts`
- Modify: `apps/mobile/lib/src/screens/work_order_detail_screen.dart`
- Modify: `apps/mobile/test/widget_test.dart`

- [ ] Ajustar o teste do anual para refletir o checklist validado em `docs/checklist.md`.
- [ ] Remover a navegacao anual especial; renderizar o payload flat completo por maquina.
- [ ] Ajustar o widget test para garantir que itens de evaporadora, condensadora, gerais e medicoes aparecem juntos.
- [ ] Executar os testes focados de backend e Flutter.

### Task 2: APK operacional sem fallback fake

**Files:**
- Modify: `apps/mobile/lib/src/app.dart`
- Modify: `apps/mobile/lib/src/auth/hybrid_login_gateway.dart`
- Create: `apps/mobile/test/hybrid_login_gateway_test.dart`
- Modify: `README.md`
- Modify: `apps/mobile/README.md`

- [ ] Escrever testes para erro sem URL e demo somente com `MOBILE_DEMO_MODE=true`.
- [ ] Confirmar que o teste falha porque o login atual cai no fake silenciosamente.
- [ ] Tornar API obrigatoria no modo operacional e propagar falhas de autenticacao/rede.
- [ ] Atualizar os comandos de build com a URL da API.
- [ ] Executar o teste focado.

### Task 3: Seguranca unica antes da OS

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/20260628210000_os_seguranca_interna/migration.sql`
- Modify: `apps/backend/src/modules/ordens-servico/dto/atualizar-status-os.dto.ts`
- Modify: `apps/backend/src/modules/ordens-servico/ordens-servico.service.ts`
- Modify: `apps/backend/src/modules/ordens-servico/ordens-servico.service.part-01.spec.ts`
- Create: `apps/mobile/lib/src/screens/safety_check_dialog.dart`
- Modify: `apps/mobile/lib/src/models/work_order.dart`
- Modify: `apps/mobile/lib/src/repositories/work_order_repository.dart`
- Modify: `apps/mobile/lib/src/repositories/api_work_order_repository.dart`
- Modify: `apps/mobile/lib/src/repositories/offline_work_order_repository.dart`
- Modify: `apps/mobile/lib/src/data/fake_work_order_repository.dart`
- Modify: `apps/mobile/lib/src/screens/work_order_detail_screen.dart`
- Modify: `apps/mobile/test/widget_test.dart`

- [ ] Escrever teste backend que rejeita inicio sem seguranca e persiste respostas completas.
- [ ] Confirmar falha antes da implementacao.
- [ ] Adicionar DTO, migracao e persistencia JSON imutavel na mesma transacao do status.
- [ ] Escrever widget test para bloqueio, NR-35 condicional e confirmacao.
- [ ] Confirmar falha antes da implementacao.
- [ ] Implementar dialogo e envio do payload com GPS/data da transicao.
- [ ] Executar testes focados, Prisma generate, build backend, Flutter analyze e `git diff --check`.
