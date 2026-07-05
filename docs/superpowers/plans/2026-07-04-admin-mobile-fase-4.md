# Admin Mobile Fase 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar busca, filtros, layout compacto, PDFs autenticados e consulta detalhada da frota no app admin mobile.

**Architecture:** `ModuleScreen` continua coordenando os modulos, mas delega filtragem para um modelo testavel e abertura de arquivos para um servico isolado. O cliente HTTP ganha download binario autenticado; as listas preservam os dados completos e derivam os resultados visiveis localmente.

**Tech Stack:** Flutter, Dart, `path_provider`, `open_filex`, `flutter_test`.

---

### Task 1: Modelo de busca e filtros

**Files:**
- Create: `apps/admin_mobile/lib/src/screens/module_filter.dart`
- Test: `apps/admin_mobile/test/module_filter_test.dart`

- [ ] **Step 1: Write the failing tests**

```dart
test('busca ignora caixa e acentos', () {
  final row = FilterableModuleRow(searchText: 'Manutencao Clinica Sao Jose', filter: 'aberta');
  expect(row.matches(query: 'manutenção são', selectedFilter: null), isTrue);
});

test('combina busca e filtro', () {
  final row = FilterableModuleRow(searchText: 'OS Hospital', filter: 'concluida');
  expect(row.matches(query: 'hospital', selectedFilter: 'aberta'), isFalse);
  expect(row.matches(query: 'hospital', selectedFilter: 'concluida'), isTrue);
});
```

- [ ] **Step 2: Run tests and verify failure**

```powershell
cd apps\admin_mobile
flutter test test\module_filter_test.dart --no-pub
```

Expected: FAIL because `module_filter.dart` does not exist.

- [ ] **Step 3: Implement the filter model**

```dart
class FilterableModuleRow {
  const FilterableModuleRow({required this.searchText, this.filter});

  final String searchText;
  final String? filter;

  bool matches({required String query, required String? selectedFilter}) {
    final normalizedQuery = normalizeSearchText(query);
    final queryMatches = normalizedQuery.isEmpty || normalizeSearchText(searchText).contains(normalizedQuery);
    final filterMatches = selectedFilter == null || selectedFilter == filter;
    return queryMatches && filterMatches;
  }
}

String normalizeSearchText(String value) {
  const source = 'abcdefghijklmnopqrstuvwxyzàáâãäçèéêëìíîïñòóôõöùúûü';
  const target = 'abcdefghijklmnopqrstuvwxyzaaaaaceeeeiiiinooooouuuu';
  final lower = value.toLowerCase().trim();
  return lower.split('').map((char) {
    final index = source.indexOf(char);
    return index < 0 ? char : target[index];
  }).join().replaceAll(RegExp(r'\s+'), ' ');
}
```

- [ ] **Step 4: Run tests and commit**

```powershell
flutter test test\module_filter_test.dart --no-pub
git add lib\src\screens\module_filter.dart test\module_filter_test.dart
git commit -m "feat(admin-mobile): add module search filters"
```

Expected: PASS.

### Task 2: Download e abertura autenticada de PDF

**Files:**
- Modify: `apps/admin_mobile/pubspec.yaml`
- Modify: `apps/admin_mobile/lib/src/services/admin_api_client.dart`
- Create: `apps/admin_mobile/lib/src/services/pdf_file_service.dart`
- Test: `apps/admin_mobile/test/admin_api_client_test.dart`

- [ ] **Step 1: Add a failing binary-download test**

```dart
test('downloadBytes sends bearer token and returns PDF metadata', () async {
  final client = AdminApiClient(baseUrl: serverUri);
  final file = await client.downloadBytes('/admin/pmoc/clientes/1/pdf', session);
  expect(file.bytes, startsWith(<int>[0x25, 0x50, 0x44, 0x46]));
  expect(file.filename, 'pmoc-cliente.pdf');
});
```

- [ ] **Step 2: Run the test and verify failure**

```powershell
flutter test test\admin_api_client_test.dart --no-pub
```

Expected: FAIL because `downloadBytes` is undefined.

- [ ] **Step 3: Add dependencies and implementation**

```yaml
dependencies:
  path_provider: ^2.1.5
  open_filex: ^4.7.0
```

```dart
class AdminDownloadedFile {
  const AdminDownloadedFile({required this.bytes, required this.filename});
  final List<int> bytes;
  final String filename;
}

Future<AdminDownloadedFile> downloadBytes(String path, AdminSession session) async {
  final client = HttpClient()..connectionTimeout = timeout;
  try {
    final request = await client.getUrl(baseUrl.resolve('/api/v1$path')).timeout(timeout);
    request.headers.set(HttpHeaders.authorizationHeader, 'Bearer ${session.accessToken}');
    final response = await request.close().timeout(timeout);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw const AdminRequestException(AdminRequestFailure.unexpected);
    }
    final bytes = await response.fold<List<int>>(<int>[], (buffer, chunk) => buffer..addAll(chunk)).timeout(timeout);
    final disposition = response.headers.value(HttpHeaders.contentDispositionHeader) ?? '';
    final filename = RegExp(r'filename="?([^";]+)').firstMatch(disposition)?.group(1) ?? 'relatorio.pdf';
    return AdminDownloadedFile(bytes: bytes, filename: filename);
  } on SocketException {
    throw const AdminRequestException(AdminRequestFailure.network);
  } on TimeoutException {
    throw const AdminRequestException(AdminRequestFailure.network);
  } finally {
    client.close(force: true);
  }
}
```

```dart
class PdfFileService {
  const PdfFileService();

  Future<void> open(AdminDownloadedFile file) async {
    final directory = await getTemporaryDirectory();
    final safeName = file.filename.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '-');
    final output = File('${directory.path}${Platform.pathSeparator}$safeName');
    await output.writeAsBytes(file.bytes, flush: true);
    final result = await OpenFilex.open(output.path, type: 'application/pdf');
    if (result.type != ResultType.done) throw const PdfOpenException();
  }
}
```

- [ ] **Step 4: Resolve packages, run tests and commit**

```powershell
flutter pub get
flutter test test\admin_api_client_test.dart --no-pub
git add pubspec.yaml pubspec.lock lib\src\services\admin_api_client.dart lib\src\services\pdf_file_service.dart test\admin_api_client_test.dart
git commit -m "feat(admin-mobile): open authenticated PDFs"
```

Expected: PASS.

### Task 3: Lista compacta, busca, filtros, PDF e detalhe de frota

**Files:**
- Modify: `apps/admin_mobile/lib/src/screens/module_screen.dart`
- Modify: `apps/admin_mobile/lib/src/screens/dashboard_screen.dart`
- Test: `apps/admin_mobile/test/module_screen_test.dart`

- [ ] **Step 1: Write failing widget tests**

```dart
testWidgets('filters module rows by query and chip', (tester) async {
  await tester.pumpWidget(moduleApp(kind: AdminModuleKind.orders));
  await tester.pumpAndSettle();
  await tester.enterText(find.byKey(const Key('module-search')), 'hospital');
  expect(find.text('OS Hospital'), findsOneWidget);
  expect(find.text('OS Loja'), findsNothing);
  await tester.tap(find.text('Concluidas'));
  await tester.pump();
  expect(find.text('OS Hospital'), findsNothing);
});

testWidgets('fleet opens read-only details', (tester) async {
  await tester.pumpWidget(moduleApp(kind: AdminModuleKind.fleet));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Van 1'));
  await tester.pumpAndSettle();
  expect(find.text('Detalhes do veiculo'), findsOneWidget);
  expect(find.text('Salvar'), findsNothing);
});
```

- [ ] **Step 2: Run tests and verify failure**

```powershell
flutter test test\module_screen_test.dart --no-pub
```

Expected: FAIL because search, chips and fleet detail are absent.

- [ ] **Step 3: Add local view state and compact controls**

```dart
String _query = '';
String? _selectedFilter;

List<ModuleRow> _visibleRows(ModuleData data) => data.rows.where((row) {
  return FilterableModuleRow(searchText: row.searchText, filter: row.filter).matches(
    query: _query,
    selectedFilter: _selectedFilter,
  );
}).toList();
```

```dart
TextField(
  key: const Key('module-search'),
  onChanged: (value) => setState(() => _query = value),
  decoration: const InputDecoration(
    hintText: 'Buscar',
    prefixIcon: Icon(Icons.search),
  ),
),
if (data.filters.isNotEmpty)
  SingleChildScrollView(
    scrollDirection: Axis.horizontal,
    child: Row(
      children: data.filters.map((filter) => Padding(
        padding: const EdgeInsets.only(right: 8),
        child: FilterChip(
          label: Text(filter.label),
          selected: _selectedFilter == filter.value,
          onSelected: (selected) => setState(() {
            _selectedFilter = selected ? filter.value : null;
          }),
        ),
      )).toList(),
    ),
  ),
..._visibleRows(data).map((row) => _DataTile(
  row: row,
  color: widget.item.color,
  onAction: _saving ? null : (action) => _handleAction(action, row),
)),
```

Replace the metrics `Row` with `LayoutBuilder`; use one column below 340 pixels and three equal columns otherwise.

- [ ] **Step 4: Add row metadata and actions**

```dart
class ModuleRow {
  const ModuleRow({
    required this.title,
    required this.subtitle,
    required this.trailing,
    this.data = const {},
    this.actions = const [],
    this.searchText = '',
    this.filter,
    this.onTapAction,
  });

  final String searchText;
  final String? filter;
  final ModuleAction? onTapAction;
}

enum ModuleAction { reschedule, approve, reject, resendPmoc, openPmocPdf, openReportPdf, viewFleet }
```

Use the following row patterns in the loaders:

```dart
ModuleRow(
  title: _text(row['nome'], fallback: 'Veiculo'),
  subtitle: _join([_text(row['placa']), _text(row['rastreador_imei'])]),
  trailing: row['ativo'] == true ? 'Ativo' : 'Inativo',
  data: row,
  searchText: _join([_text(row['nome']), _text(row['placa']), _text(row['rastreador_imei'])]),
  filter: row['ativo'] == true ? 'ativo' : 'inativo',
  onTapAction: ModuleAction.viewFleet,
)
```

```dart
ModuleRow(
  title: _text(row['nome'] ?? row['cliente_nome'], fallback: 'Relatorio avulso'),
  subtitle: 'Relatorio tecnico disponivel',
  trailing: 'PDF',
  data: row,
  searchText: _join([_text(row['nome']), _text(row['cliente_nome'])]),
  actions: const [ModuleAction.openReportPdf],
)
```

Add these action branches:

```dart
case ModuleAction.openPmocPdf:
  await _openPdf('/admin/pmoc/clientes/${row.id}/pdf');
case ModuleAction.openReportPdf:
  await _openPdf('/admin/relatorios-avulsos/clientes/${row.id}/pdf');
case ModuleAction.viewFleet:
  await showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (context) => _FleetDetails(data: row.data),
  );
```

```dart
Future<void> _openPdf(String path) async {
  setState(() => _saving = true);
  try {
    final file = await widget.apiClient.downloadBytes(path, widget.session);
    await widget.pdfFileService.open(file);
  } catch (_) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nao foi possivel abrir o PDF.')),
      );
    }
  } finally {
    if (mounted) setState(() => _saving = false);
  }
}
```

- [ ] **Step 5: Run widget tests and commit**

```powershell
flutter test test\module_screen_test.dart --no-pub
git add lib\src\screens\module_screen.dart lib\src\screens\dashboard_screen.dart test\module_screen_test.dart
git commit -m "feat(admin-mobile): finish compact module experience"
```

Expected: PASS without layout overflow.

### Task 4: Final validation and handoff

**Files:**
- Modify: `resumo.md`

- [ ] **Step 1: Run the full validations**

```powershell
cd apps\admin_mobile
flutter analyze --no-pub
flutter test --no-pub
```

Expected: `No issues found` and all tests pass.

- [ ] **Step 2: Update project handoff**

Write this completed section in `resumo.md`:

```markdown
- Fase 4 do app admin implementada:
  - busca e filtros locais nos modulos;
  - layout compacto para celular pequeno;
  - abertura autenticada de PDF PMOC e relatorio avulso;
  - detalhes da frota somente para consulta.
- Notificacoes aguardam definicao Meta/telefone.
- Build APK admin permanece para o final.
```

- [ ] **Step 3: Verify and commit**

```powershell
git diff --check
git status --short
git add resumo.md
git commit -m "docs: record admin mobile phase 4"
```

Expected: only intended files are committed and the worktree is clean.
