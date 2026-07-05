# Convite para Autocadastro do Tecnico Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar ao painel administrativo um convite de uso unico e 24 horas para o tecnico realizar seu proprio cadastro completo no aplicativo, preservando o cadastro manual existente.

**Architecture:** O PostgreSQL armazena apenas o hash e a auditoria do convite. Endpoints administrativos geram, listam e cancelam convites; endpoints publicos validam e consomem o codigo. O aplicativo reutiliza o formulario de primeiro acesso em modo autocadastro, incluindo e-mail e login, e recebe uma sessao normal ao concluir.

**Tech Stack:** NestJS, Prisma/PostgreSQL, TypeScript, JavaScript modular, Flutter/Dart, Node test runner.

---

### Task 1: Persistencia e dominio do convite

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/20260703180000_convite_tecnico/migration.sql`
- Create: `apps/backend/src/modules/auth/convite-tecnico-codigo.ts`
- Create: `apps/backend/src/modules/admin/services/admin-convites-tecnico.service.ts`
- Test: `apps/backend/src/modules/admin/services/admin-convites-tecnico.service.spec.ts`

- [ ] Criar teste que exige codigo aleatorio, hash SHA-256, validade de 24 horas, listagem por empresa e cancelamento apenas de convite pendente.
- [ ] Executar `npm run backend:test -- --test-name-pattern="convite"` e confirmar falha inicial.
- [ ] Adicionar o modelo `ConviteTecnico` com empresa, emissor, hash unico, sufixo, expiracao, cancelamento, consumo e usuario criado.
- [ ] Implementar geracao criptografica, normalizacao e hash do codigo.
- [ ] Implementar o servico administrativo com isolamento por empresa.
- [ ] Gerar o Prisma Client e executar os testes do servico.

### Task 2: API administrativa

**Files:**
- Modify: `apps/backend/src/modules/admin/admin.module.ts`
- Modify: `apps/backend/src/modules/admin/admin.service.ts`
- Modify: `apps/backend/src/modules/admin/admin.controller.ts`
- Test: `apps/backend/src/modules/admin/admin.service.part-06.spec.ts`

- [ ] Testar `POST /admin/convites-tecnico`, `GET /admin/convites-tecnico` e `DELETE /admin/convites-tecnico/:id` via delegacao do servico.
- [ ] Registrar `AdminConvitesTecnicoService` no modulo.
- [ ] Expor os tres metodos no facade `AdminService` e no controller protegido.
- [ ] Executar os testes administrativos e confirmar passagem.

### Task 3: Validacao publica e conclusao do autocadastro

**Files:**
- Create: `apps/backend/src/modules/auth/dto/validar-convite-tecnico.dto.ts`
- Create: `apps/backend/src/modules/auth/dto/cadastrar-com-convite.dto.ts`
- Create: `apps/backend/src/modules/auth/public-rate-limit.service.ts`
- Modify: `apps/backend/src/modules/auth/auth.controller.ts`
- Modify: `apps/backend/src/modules/auth/auth.module.ts`
- Modify: `apps/backend/src/modules/auth/auth.service.ts`
- Test: `apps/backend/src/modules/auth/auth.service.spec.ts`

- [ ] Testar rejeicao de codigo inexistente, vencido, cancelado e usado.
- [ ] Testar duplicidade de login, CPF e e-mail.
- [ ] Testar consumo atomico do convite, criacao do tecnico, documento, perfil e retorno dos tokens.
- [ ] Implementar validacao publica sem expor empresa ou dados internos.
- [ ] Implementar limite por IP para validacao e cadastro.
- [ ] Implementar multipart `POST /auth/cadastro-convite` com foto e assinatura obrigatorias.
- [ ] Reutilizar geracao do termo, storage e resposta de autenticacao existentes.
- [ ] Executar os testes de autenticacao.

### Task 4: Painel administrativo

**Files:**
- Modify: `apps/admin/index.html`
- Modify: `apps/admin/js/modules/api.js`
- Modify: `apps/admin/js/modules/relatorios.js`
- Modify: `apps/admin/js/modules/eventos.js`
- Modify: `apps/admin/js/modules/ui/dom.js`
- Modify: `apps/admin/js/main.js`
- Modify: `tests/frontend-contracts.test.js`

- [ ] Adicionar contrato de frontend para botao, lista, copia e cancelamento.
- [ ] Adicionar **Gerar convite** sem remover o formulario manual.
- [ ] Mostrar o codigo completo apenas apos gerar e permitir copia.
- [ ] Renderizar estado e validade dos convites e permitir cancelar pendentes.
- [ ] Atualizar a versao de cache dos modulos.
- [ ] Executar `npm run frontend:test`.

### Task 5: Aplicativo Flutter

**Files:**
- Modify: `apps/mobile/lib/src/auth/mobile_login_gateway.dart`
- Modify: `apps/mobile/lib/src/auth/api_login_gateway.dart`
- Modify: `apps/mobile/lib/src/auth/fake_login_gateway.dart`
- Modify: `apps/mobile/lib/src/auth/hybrid_login_gateway.dart`
- Modify: `apps/mobile/lib/src/screens/login_screen.dart`
- Modify: `apps/mobile/lib/src/screens/first_access_screen.dart`
- Test: `apps/mobile/test/api_login_gateway_test.dart`
- Test: `apps/mobile/test/widget_test.dart`

- [ ] Testar validacao do convite e multipart com codigo, e-mail, login, foto, assinatura e termo.
- [ ] Estender o gateway com `validateInvite` e `registerWithInvite`.
- [ ] Adicionar **Primeiro cadastro** e entrada do codigo na tela de login.
- [ ] Reutilizar `FirstAccessScreen` em modo convite e coletar e-mail e login somente nesse modo.
- [ ] Exibir mensagens para convite invalido ou vencido.
- [ ] Executar os testes Flutter disponiveis e `flutter analyze --no-pub`.

### Task 6: Verificacao final

**Files:**
- Modify: `docs/superpowers/plans/2026-07-03-convite-autocadastro-tecnico.md`

- [ ] Executar `npm run backend:test`.
- [ ] Executar `npm run backend:build`.
- [ ] Executar `npm run frontend:test`.
- [ ] Executar `flutter analyze --no-pub` em `apps/mobile`.
- [ ] Executar `git diff --check` e revisar que `apps/mobile/lib/src/widgets/dashboard_metrics_panel.dart` permaneceu intacto.
- [ ] Marcar todas as tarefas concluídas e criar commit final da implementacao.
