# App, Periodicidade Anual e Login Curto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir o retorno e o layout do app, preservar a periodicidade anual independente em todo o sistema e permitir login curto unico na API de producao sem interromper o acesso por email.

**Architecture:** O app retorna a OS atualizada pelo Navigator e o dashboard recarrega a lista. A periodicidade anual permanece um valor proprio desde os formularios web ate agenda, recorrencia e PDF. O usuario recebe um identificador `login` globalmente unico; a autenticacao procura por login ou email para manter compatibilidade.

**Tech Stack:** Flutter/Dart, JavaScript sem framework, NestJS/TypeScript, Prisma/PostgreSQL, Node Test Runner.

---

### Task 1: Retorno da OS e layout responsivo no app

**Files:**
- Modify: `apps/mobile/lib/src/screens/work_order_detail_screen.dart`
- Modify: `apps/mobile/lib/src/screens/dashboard_screen.dart`
- Test: `apps/mobile/test/widget_test.dart`

- [ ] **Step 1: Escrever testes que falham**

Adicionar testes que finalizam uma OS online e offline e verificam:

```dart
expect(find.text('Detalhes da OS'), findsNothing);
expect(find.byKey(const Key('myMaintenanceButton')), findsOneWidget);
expect(find.text('Ordens de servico'), findsOneWidget);
```

Adicionar um teste com viewport de celular e texto ampliado:

```dart
await tester.binding.setSurfaceSize(const Size(360, 800));
tester.platformDispatcher.textScaleFactorTestValue = 1.5;
expect(tester.takeException(), isNull);
```

- [ ] **Step 2: Executar os testes e confirmar falha**

Run: `flutter test test/widget_test.dart`
Expected: FAIL porque a tela de detalhes continua aberta e o cabecalho gera overflow.

- [ ] **Step 3: Implementar navegacao e feedback**

Em `_finishWorkOrder`, retornar o resultado apos sucesso:

```dart
if (!mounted) return;
Navigator.of(context).pop(updated);
```

Em `_openOrder`, receber o resultado, manter `_showMaintenance = true`, recarregar e mostrar confirmacao:

```dart
final updated = await Navigator.of(context).push<WorkOrder>(...);
if (!mounted) return;
setState(() {
  _showMaintenance = true;
  _ordersFuture = widget.repository.listMine();
});
if (updated != null) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(updated.status == WorkOrderStatus.waitingSync
      ? 'Finalizacao aguardando sincronizacao.'
      : 'OS finalizada.')),
  );
}
```

- [ ] **Step 4: Tornar `_MachineListHeader` responsivo**

Trocar o `Row` rigido por `Wrap` e colocar o divisor abaixo:

```dart
Column(
  crossAxisAlignment: CrossAxisAlignment.stretch,
  children: [
    Wrap(spacing: 8, runSpacing: 6, crossAxisAlignment: WrapCrossAlignment.center,
      children: [Text(title, style: ...), _StatusPill(...)],
    ),
    const SizedBox(height: 6),
    const Divider(color: airmovebrBorder),
  ],
)
```

- [ ] **Step 5: Executar testes Flutter**

Run: `flutter test`
Expected: PASS.

### Task 2: Periodicidade anual no painel e backend

**Files:**
- Modify: `apps/admin/index.html`
- Modify: `apps/admin/js/modules/agenda.js`
- Modify: `apps/admin/js/modules/eventos.js`
- Modify: `apps/backend/src/modules/admin/services/admin-agenda.service.ts`
- Modify: `apps/backend/src/modules/admin/services/admin-recorrencia.service.ts`
- Modify: `apps/backend/src/modules/admin/admin.service.part-03.spec.ts`
- Test: `tests/frontend-contracts.test.js`

- [ ] **Step 1: Escrever contratos anuais que falham**

Adicionar assercoes para `<option value="anual">Anual</option>` nos formularios de recorrencia e OS e testes backend esperando `ChecklistTipo.anual`.

- [ ] **Step 2: Executar testes focados**

Run: `npm run frontend:test`
Expected: FAIL sem a opcao anual.

Run: `npm run backend:test -- --test-name-pattern="anual"`
Expected: FAIL porque anual ainda vira semestral e a recorrencia avanca seis meses.

- [ ] **Step 3: Adicionar opcao e rotulos no painel**

Adicionar `Anual` aos dois selects e aos mapas:

```js
const labels = { mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual' };
```

- [ ] **Step 4: Preservar anual na agenda e recorrencia**

Usar o valor recebido sem conversao:

```ts
return dto.checklist_tipo ?? ChecklistTipo.mensal;
```

Corrigir recorrencia:

```ts
[PlanoRecorrenciaFrequencia.anual]: 12
[PlanoRecorrenciaFrequencia.anual]: ChecklistTipo.anual
```

- [ ] **Step 5: Executar testes frontend e backend**

Run: `npm run frontend:test`
Expected: PASS.

Run: `npm run backend:test`
Expected: PASS.

### Task 3: PDF anual com checklist independente

**Files:**
- Modify: `apps/backend/src/modules/admin/services/admin-pmoc-pdf-renderer.service.ts`
- Modify: `apps/backend/src/modules/admin/admin.service.part-05.spec.ts`
- Reference: `apps/backend/src/modules/mobile/mobile-checklists.ts`

- [ ] **Step 1: Escrever teste de PDF anual que falha**

Criar previa com `checklist_tipo: "anual"` e verificar rotulo e atividades anuais, sem marcar itens mensais, trimestrais ou semestrais como executados.

- [ ] **Step 2: Executar teste focado**

Run: `npm run backend:test -- --test-name-pattern="PDF anual"`
Expected: FAIL porque anual e convertido em semestral.

- [ ] **Step 3: Implementar periodicidade anual exclusiva**

Ampliar o tipo:

```ts
type PeriodicidadePmoc = 'mensal' | 'trimestral' | 'semestral' | 'anual';
```

Adicionar atividades anuais equivalentes ao checklist `ANU_*`, retornar `anual` diretamente e substituir a comparacao cumulativa por igualdade:

```ts
private periodicidadeInclui(executada: PeriodicidadePmoc, prevista: PeriodicidadePmoc) {
  return executada === prevista;
}
```

- [ ] **Step 4: Executar testes do backend**

Run: `npm run backend:test`
Expected: PASS.

### Task 4: Login curto unico com compatibilidade por email

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/20260628150000_usuario_login_curto/migration.sql`
- Modify: `apps/backend/src/modules/auth/dto/login.dto.ts`
- Modify: `apps/backend/src/modules/auth/auth.service.ts`
- Modify: `apps/backend/src/modules/auth/auth.service.spec.ts`
- Modify: `apps/backend/src/modules/admin/dto/salvar-tecnico.dto.ts`
- Modify: `apps/backend/src/modules/admin/services/admin-tecnicos.service.ts`
- Modify: `apps/backend/src/modules/admin/admin.service.part-02.spec.ts`
- Modify: `apps/backend/prisma/seed.ts`
- Modify: `apps/backend/prisma/seed_airmovebr_pmoc.ts`
- Modify: `apps/mobile/lib/src/auth/api_login_gateway.dart`
- Create: `apps/mobile/test/api_login_gateway_test.dart`
- Modify: `apps/admin/index.html`
- Modify: `apps/admin/js/modules/api.js`
- Modify: `apps/admin/js/modules/relatorios.js`
- Modify: `apps/admin/js/modules/ui/dom.js`
- Modify: `apps/admin/js/modules/clientes.js`
- Test: `tests/frontend-contracts.test.js`

- [ ] **Step 1: Escrever testes de login e unicidade que falham**

Cobrir login curto, email legado, normalizacao e conflito. O login curto esperado e `tecnico`.

- [ ] **Step 2: Criar coluna e migracao segura**

Adicionar ao Prisma:

```prisma
login String? @unique
```

SQL:

```sql
ALTER TABLE "usuarios" ADD COLUMN "login" TEXT;
UPDATE "usuarios" SET "login" = 'tecnico'
WHERE lower("email") = 'tecnico@airmovebr.local';
CREATE UNIQUE INDEX "usuarios_login_key" ON "usuarios"("login");
```

- [ ] **Step 3: Aceitar identificador por login ou email**

Normalizar o identificador e consultar:

```ts
const identificador = (dto.login ?? dto.email ?? '').trim().toLowerCase();
where: {
  OR: [{ login: identificador }, { email: identificador }],
  ativo: true,
  empresa: { ativa: true }
}
```

- [ ] **Step 4: Exigir login no cadastro web**

Adicionar campo `login` separado do `email`, enviar no payload, preencher na edicao e exibir na lista. Normalizar no backend e rejeitar duplicidade com `ConflictException('Login ja cadastrado.')`.

- [ ] **Step 5: Atualizar app e painel para enviar `login`**

O app envia:

```dart
request.write(jsonEncode({'login': user.trim(), 'senha': password}));
```

O painel envia `{ login, senha }`, mantendo o campo de email apenas no cadastro do usuario.

- [ ] **Step 6: Gerar Prisma e executar testes**

Run: `npm run backend:prisma:generate`
Expected: Prisma Client gerado.

Run: `npm run backend:test`
Expected: PASS.

Run: `npm run frontend:test`
Expected: PASS.

Run: `flutter test`
Expected: PASS.

### Task 5: Verificacao integrada

**Files:**
- Verify only.

- [ ] **Step 1: Validar formatacao e arvore**

Run: `git diff --check`
Expected: sem erros.

- [ ] **Step 2: Executar suite final**

Run: `npm run frontend:test`
Run: `npm run backend:test`
Run: `flutter test`
Expected: todas passam.

- [ ] **Step 3: Testar APK contra Locaweb apos deploy**

Run:

```powershell
flutter run -d RQCX100GGZE --dart-define=MOBILE_API_BASE_URL=https://api.airmovebr.com.br
```

Expected: login por `tecnico`, lista de manutencoes carregada, finalizacao retorna ao dashboard e tela sem overflow.
