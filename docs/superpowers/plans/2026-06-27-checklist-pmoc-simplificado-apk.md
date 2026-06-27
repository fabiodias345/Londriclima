# Checklist PMOC Simplificado no APK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar no APK os quatro checklists PMOC independentes, com respostas estruturadas, medições, fotos por máquina, persistência parcial e ordem anual por evaporadora ou condensadora.

**Architecture:** O backend continua sendo a fonte única dos checklists por meio de um catálogo puro e testável. A API mobile passa a devolver respostas já salvas por máquina e o endpoint de checklist faz upsert parcial. O Flutter renderiza as opções recebidas, restaura progresso e organiza o anual por etapa sem alterar painel, relatório técnico ou PDF PMOC.

**Tech Stack:** NestJS 10, TypeScript, Prisma/PostgreSQL, Flutter/Dart, `node:test`, `flutter_test`.

---

## Estrutura de arquivos

- Criar `apps/backend/src/modules/mobile/mobile-checklists.ts`: catálogo, tipos, periodicidades e validação de completude.
- Criar `apps/backend/src/modules/mobile/mobile-checklists.spec.ts`: contrato exato dos quatro checklists.
- Modificar `apps/backend/src/modules/mobile/mobile.service.ts`: consumir o catálogo e devolver respostas/progresso por máquina.
- Modificar `apps/backend/src/modules/ordens-servico/ordens-servico.service.ts`: salvar respostas parciais por upsert.
- Modificar testes dos serviços backend afetados.
- Modificar `apps/mobile/lib/src/models/work_order.dart`: etapa do item e respostas persistidas por máquina.
- Modificar `apps/mobile/lib/src/repositories/api_work_order_repository.dart`: ler respostas e etapa.
- Modificar `apps/mobile/lib/src/repositories/offline_work_order_repository.dart`: preservar respostas parciais e fotos offline.
- Modificar `apps/mobile/lib/src/screens/work_order_detail_screen.dart`: opções estruturadas, restauração do progresso e fluxo anual por etapa.
- Modificar testes Flutter de repositório e widgets.

### Task 1: Catálogo independente dos checklists

**Files:**
- Create: `apps/backend/src/modules/mobile/mobile-checklists.ts`
- Create: `apps/backend/src/modules/mobile/mobile-checklists.spec.ts`
- Modify: `apps/backend/src/modules/mobile/mobile.service.ts`
- Modify: `apps/backend/src/modules/mobile/mobile.service.spec.ts`

- [ ] **Step 1: Escrever testes que fixem os códigos e a independência das periodicidades**

Criar testes chamando `montarChecklistMobile(ChecklistTipo.<tipo>)` e verificando exatamente:

```ts
assert.deepEqual(codigos(ChecklistTipo.mensal), [
  "MEN_FILTRO", "MEN_CONTROLE", "MEN_DRENO", "MEN_VISUAL",
  "MEN_TEMP_INSUFLAMENTO", "MEN_TEMP_RETORNO", "MEN_FOTO_INSUFLAMENTO", "MEN_FOTO_FILTRO"
]);
assert.deepEqual(codigos(ChecklistTipo.trimestral), [
  "TRI_FILTRO", "TRI_CONTROLE", "TRI_DRENO", "TRI_VISUAL", "TRI_SERPENTINA",
  "TRI_ELETRICA", "TRI_MOTORES", "TRI_ISOLAMENTO", "TRI_CIRCUITO",
  "TRI_TEMP_INSUFLAMENTO", "TRI_TEMP_RETORNO", "TRI_FOTO_INSUFLAMENTO", "TRI_FOTO_FILTRO"
]);
assert.deepEqual(codigos(ChecklistTipo.semestral), [
  "SEM_CONTROLE", "SEM_HIGIENIZACAO_EVAP", "SEM_FOTO_BOLSAO", "SEM_MOTORES",
  "SEM_FIXACOES", "SEM_TEMP_INSUFLAMENTO", "SEM_FOTO_INSUFLAMENTO"
]);
assert.deepEqual(codigos(ChecklistTipo.anual), [
  "ANU_CONTROLE", "ANU_HIGIENIZACAO_EVAP", "ANU_FOTO_BOLSAO",
  "ANU_HIGIENIZACAO_COND", "ANU_FOTO_COND", "ANU_CIRCUITO", "ANU_ELETRICA",
  "ANU_ISOLAMENTO", "ANU_TEMP_INSUFLAMENTO", "ANU_TEMP_RETORNO", "ANU_FOTO_INSUFLAMENTO"
]);
```

- [ ] **Step 2: Executar o teste e confirmar a falha**

Run: `npm run backend:test -- --test-name-pattern="checklist mobile"`

Expected: FAIL porque `mobile-checklists.ts` ainda não existe e o serviço ainda acumula periodicidades.

- [ ] **Step 3: Criar o catálogo com opções e etapas explícitas**

Usar este contrato:

```ts
export type ChecklistItemTipo = "select_obs" | "numerico" | "foto";
export type ChecklistEtapa = "geral" | "evaporadora" | "condensadora" | "medicoes";
export type ChecklistItem = {
  codigo: string;
  item: string;
  tipo: ChecklistItemTipo;
  opcoes?: string[];
  unidade?: string;
  obrigatorio: true;
  etapa: ChecklistEtapa;
};

const executar = ["Executado", "Não executado"];
const verificar = ["Normal", "Irregularidade encontrada", "Não testado"];
```

Definir os quatro arrays exatamente conforme a especificação. Itens de limpeza/higienização usam `executar`; testes, revisões e inspeções usam `verificar`; temperaturas usam `numerico`; evidências usam `foto`. Exportar:

```ts
export function montarChecklistMobile(tipo: ChecklistTipo): ChecklistItem[] {
  return checklistPorTipo[tipo].map((item) => ({ ...item }));
}

export function codigosObrigatoriosChecklist(tipo: ChecklistTipo): string[] {
  return checklistPorTipo[tipo].map((item) => item.codigo);
}
```

- [ ] **Step 4: Trocar `MobileService` para usar o catálogo**

Remover as constantes antigas e `montarChecklist`. Importar `montarChecklistMobile` e retornar:

```ts
checklist: montarChecklistMobile(ordem.checklistTipo ?? ChecklistTipo.mensal)
```

- [ ] **Step 5: Executar os testes do módulo mobile**

Run: `npm run backend:test -- --test-name-pattern="checklist|listarOrdens"`

Expected: PASS para os novos contratos, sem códigos acumulados entre periodicidades.

- [ ] **Step 6: Commit**

```powershell
git add apps/backend/src/modules/mobile/mobile-checklists.ts apps/backend/src/modules/mobile/mobile-checklists.spec.ts apps/backend/src/modules/mobile/mobile.service.ts apps/backend/src/modules/mobile/mobile.service.spec.ts
git commit -m "feat: simplifica checklists PMOC da API mobile"
```

### Task 2: Persistência parcial e progresso por máquina

**Files:**
- Modify: `apps/backend/src/modules/ordens-servico/ordens-servico.service.ts`
- Modify: `apps/backend/src/modules/ordens-servico/ordens-servico.service.part-01.spec.ts`
- Modify: `apps/backend/src/modules/mobile/mobile.service.ts`
- Modify: `apps/backend/src/modules/mobile/mobile.service.spec.ts`

- [ ] **Step 1: Escrever teste de upsert parcial**

O teste deve salvar dois itens, salvar outro item depois e afirmar que não houve `deleteMany`. Deve verificar um upsert por resposta com a chave existente:

```ts
where: {
  ordemServicoId_equipamentoId_codigo: {
    ordemServicoId: "os-1",
    equipamentoId: "equip-1",
    codigo: "ANU_FOTO_COND"
  }
}
```

- [ ] **Step 2: Executar o teste e confirmar a falha**

Run: `npm run backend:test -- --test-name-pattern="parcial"`

Expected: FAIL porque o código atual apaga todas as respostas da máquina.

- [ ] **Step 3: Substituir exclusão/criação por upsert**

Dentro de `salvarRespostas`, usar:

```ts
await Promise.all(respostas.map((resposta) => tx.ordemServicoChecklistResposta.upsert({
  where: {
    ordemServicoId_equipamentoId_codigo: {
      ordemServicoId: osId,
      equipamentoId,
      codigo: resposta.codigo
    }
  },
  update: {
    checklistId,
    checklistTipo,
    tipo: resposta.tipo,
    valor: resposta.valor,
    observacao: resposta.observacao?.trim() || null
  },
  create: {
    empresaId: ordemServico.empresaId,
    ordemServicoId: osId,
    checklistId,
    equipamentoId,
    checklistTipo,
    codigo: resposta.codigo,
    tipo: resposta.tipo,
    valor: resposta.valor,
    observacao: resposta.observacao?.trim() || null
  }
})));
```

- [ ] **Step 4: Devolver respostas e completude na API mobile**

Expandir o select de `checklistRespostas` para `equipamentoId`, `codigo`, `tipo`, `valor` e `observacao`. Em cada equipamento retornar:

```ts
checklist_respostas: respostasDaMaquina.map((resposta) => ({
  codigo: resposta.codigo,
  tipo: resposta.tipo,
  valor: resposta.valor,
  observacao: resposta.observacao
})),
status_execucao: codigosObrigatorios.every((codigo) => codigosRespondidos.has(codigo))
  ? "feito"
  : codigosRespondidos.size > 0 ? "em_andamento" : "pendente"
```

Atualizar também `finalizarOs`: para cada máquina, comparar os códigos salvos com `codigosObrigatoriosChecklist(ordemServico.checklistTipo)`. Uma única resposta não pode mais marcar a máquina como concluída.

- [ ] **Step 5: Executar os testes backend afetados**

Run: `npm run backend:test -- --test-name-pattern="registrarChecklist|listarOrdens"`

Expected: PASS, preservando respostas anteriores e calculando `em_andamento`/`feito`.

- [ ] **Step 6: Commit**

```powershell
git add apps/backend/src/modules/ordens-servico/ordens-servico.service.ts apps/backend/src/modules/ordens-servico/ordens-servico.service.part-01.spec.ts apps/backend/src/modules/mobile/mobile.service.ts apps/backend/src/modules/mobile/mobile.service.spec.ts
git commit -m "feat: salva progresso parcial do checklist por maquina"
```

### Task 3: Modelo Flutter e leitura do novo contrato

**Files:**
- Modify: `apps/mobile/lib/src/models/work_order.dart`
- Modify: `apps/mobile/lib/src/repositories/api_work_order_repository.dart`
- Modify: `apps/mobile/test/api_work_order_repository_test.dart`

- [ ] **Step 1: Escrever teste de parsing de etapa e respostas persistidas**

Adicionar no JSON de teste um item com `etapa: "condensadora"` e uma máquina com:

```dart
'checklist_respostas': [
  {
    'codigo': 'ANU_FOTO_COND',
    'tipo': 'foto',
    'valor': '/storage/os/os-1/checklist/eq-1/ANU_FOTO_COND.jpg',
    'observacao': null,
  }
]
```

Verificar `item.stage == 'condensadora'`, `equipment.checklistResponses.length == 1` e `serviceLabel == 'Preventiva anual'`.

- [ ] **Step 2: Executar o teste e confirmar a falha**

Run: `cd apps/mobile; flutter test test/api_work_order_repository_test.dart`

Expected: FAIL porque os campos ainda não existem e anual aparece como semestral.

- [ ] **Step 3: Adicionar os campos ao modelo**

```dart
class WorkOrderChecklistItem {
  const WorkOrderChecklistItem({
    required this.code,
    required this.label,
    required this.kind,
    this.options = const [],
    this.unit,
    this.required = true,
    this.stage = 'geral',
  });
  final String stage;
}

class WorkOrderEquipment {
  const WorkOrderEquipment({
    required this.id,
    this.qrCode = '',
    this.type = '',
    this.brand = '',
    required this.name,
    required this.location,
    required this.model,
    this.btus,
    this.gas = '',
    this.serialNumber = '',
    this.impossibleFields = const {},
    this.executionStatus = 'pendente',
    this.checklistResponses = const [],
  });
  final List<WorkOrderChecklistResponse> checklistResponses;
}
```

Corrigir `_checklistTypeLabel` para retornar `Anual` em `anual`.

- [ ] **Step 4: Mapear o JSON da API**

Ler `etapa` em `_checklistFromJson` e criar `_responsesFromJson` para `checklist_respostas`, preservando observações nulas.

- [ ] **Step 5: Executar o teste do repositório**

Run: `cd apps/mobile; flutter test test/api_work_order_repository_test.dart`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add apps/mobile/lib/src/models/work_order.dart apps/mobile/lib/src/repositories/api_work_order_repository.dart apps/mobile/test/api_work_order_repository_test.dart
git commit -m "feat: carrega progresso do checklist no APK"
```

### Task 4: Renderização, observações e restauração da máquina

**Files:**
- Modify: `apps/mobile/lib/src/screens/work_order_detail_screen.dart`
- Modify: `apps/mobile/test/widget_test.dart`

- [ ] **Step 1: Escrever testes de widget para as novas respostas**

Cobrir:

```dart
expect(find.text('Executado'), findsOneWidget);
expect(find.text('Não executado'), findsOneWidget);
expect(find.text('Normal'), findsWidgets);
expect(find.text('Irregularidade encontrada'), findsWidgets);
expect(find.text('Não testado'), findsWidgets);
```

Selecionar `Irregularidade encontrada`, tentar salvar e verificar `Observação obrigatória`. Reabrir uma máquina com respostas e verificar valores/foto restaurados.

- [ ] **Step 2: Executar o teste e confirmar a falha**

Run: `cd apps/mobile; flutter test test/widget_test.dart --plain-name "checklist simplificado"`

Expected: FAIL porque o widget ainda mostra `Sim/Não` e não restaura respostas.

- [ ] **Step 3: Renderizar todo `select_obs` com botões de opção**

Substituir o dropdown por botões usando `item.options`. Mostrar observação quando o valor normalizado for um destes:

```dart
const valuesRequiringNote = {
  'não executado',
  'irregularidade encontrada',
  'não testado',
};
```

Remover as regras antigas baseadas nos códigos `T5`, `S4`, `Sim` e `Não`.

- [ ] **Step 4: Restaurar respostas ao selecionar a máquina**

Criar `_loadChecklistResponses(WorkOrderEquipment equipment)` que preenche `_checklistValues`, `_textControllers` e `_noteControllers`. Chamá-lo junto de `_loadMachineForm`.

- [ ] **Step 5: Manter a evidência inicial automática sem foto extra**

Trocar a regra fixa `item.code == 'M4'` por uma flag da OS. No primeiro upload de qualquer item `foto`, chamar `saveInitialEvidence` uma única vez com a mesma imagem. Remover o bloqueio do botão baseado em `_initialEvidenceSaved`; a validação normal dos itens já exige todas as fotos previstas na periodicidade.

- [ ] **Step 6: Atualizar grupos visuais**

Usar `item.stage` antes de inferir pelo texto:

```dart
return switch (item.stage) {
  'evaporadora' => 'Evaporadora',
  'condensadora' => 'Condensadora',
  'medicoes' => 'Medições e fotos',
  _ => 'Verificações gerais',
};
```

- [ ] **Step 7: Executar os testes de widget**

Run: `cd apps/mobile; flutter test test/widget_test.dart`

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add apps/mobile/lib/src/screens/work_order_detail_screen.dart apps/mobile/test/widget_test.dart
git commit -m "feat: mostra checklist PMOC simplificado no APK"
```

### Task 5: Fluxo anual por evaporadora ou condensadora

**Files:**
- Modify: `apps/mobile/lib/src/screens/work_order_detail_screen.dart`
- Modify: `apps/mobile/test/widget_test.dart`

- [ ] **Step 1: Escrever testes da ordem anual**

Abrir OS anual e verificar `Evaporadoras primeiro` selecionado. Trocar para `Condensadoras primeiro`, selecionar uma máquina e verificar que os itens `etapa == condensadora` aparecem antes. Salvar a etapa e verificar que a máquina permanece `em andamento` até as demais etapas terminarem.

- [ ] **Step 2: Executar o teste e confirmar a falha**

Run: `cd apps/mobile; flutter test test/widget_test.dart --plain-name "ordem anual"`

Expected: FAIL porque a escolha ainda não existe.

- [ ] **Step 3: Adicionar estado e seletor de ordem**

```dart
enum _AnnualStageOrder { evaporatorsFirst, condensersFirst }

_AnnualStageOrder _annualStageOrder = _AnnualStageOrder.evaporatorsFirst;
```

Exibir o seletor somente quando `checklistType == 'anual'`. Ordenar grupos sem alterar os códigos enviados ao backend.

- [ ] **Step 4: Salvar somente a etapa visível**

Extrair `_buildChecklistResponses(Iterable<WorkOrderChecklistItem> items)` e enviar somente os itens da etapa atual. Após a resposta, recarregar a OS pela API ou mesclar localmente as respostas salvas. Marcar a máquina como concluída apenas quando todos os códigos obrigatórios estiverem presentes.

- [ ] **Step 5: Executar os testes de widget**

Run: `cd apps/mobile; flutter test test/widget_test.dart`

Expected: PASS para ordem padrão, troca de ordem e conclusão parcial.

- [ ] **Step 6: Commit**

```powershell
git add apps/mobile/lib/src/screens/work_order_detail_screen.dart apps/mobile/test/widget_test.dart
git commit -m "feat: permite escolher ordem da manutencao anual"
```

### Task 6: Offline e verificação final

**Files:**
- Modify: `apps/mobile/lib/src/repositories/offline_work_order_repository.dart`
- Modify: `apps/mobile/test/offline_work_order_repository_test.dart`
- Modify: `resumo.md`

- [ ] **Step 1: Escrever teste de duas etapas offline na mesma máquina**

Enfileirar respostas de evaporadora e condensadora separadamente, sincronizar e verificar duas chamadas sem perda ou duplicação. Verificar que fotos mantêm `equipamento_id` e `codigo`.

- [ ] **Step 2: Executar o teste e confirmar a falha**

Run: `cd apps/mobile; flutter test test/offline_work_order_repository_test.dart`

Expected: FAIL se a segunda etapa substituir a primeira no cache local.

- [ ] **Step 3: Mesclar respostas offline por OS, máquina e código**

Usar a chave lógica `${order.id}|$equipmentId|${response.code}` ao atualizar o snapshot local, mantendo cada envio pendente idempotente.

- [ ] **Step 4: Executar toda a verificação proporcional ao escopo**

```powershell
npm run backend:test
npm run backend:build
cd apps/mobile
flutter test
flutter analyze --no-pub
```

Expected: todos os comandos encerram com código `0`.

- [ ] **Step 5: Atualizar `resumo.md`**

Registrar que o checklist simplificado foi implementado no APK/API mobile e que painel, relatório e PDF PMOC continuam pendentes de adaptação e validação futura.

- [ ] **Step 6: Commit**

```powershell
git add apps/mobile/lib/src/repositories/offline_work_order_repository.dart apps/mobile/test/offline_work_order_repository_test.dart resumo.md
git commit -m "test: valida checklist PMOC simplificado offline"
```
