# Divisão do AdminRelatorioTecnicoCoreService Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduzir `admin-relatorio-tecnico-core.service.ts` para menos de 500 linhas, separando PMOC e relatório/resumo sem alterar comportamento.

**Architecture:** O serviço atual permanece como fachada compatível. Dois núcleos de domínio recebem a implementação existente: `AdminPmocCoreService` e `AdminRelatorioResumoCoreService`; serviços administrativos existentes continuam responsáveis por seus próprios domínios.

**Tech Stack:** NestJS, TypeScript, Prisma, Node Test, PDF 1.4 existente.

---

### Task 1: Baseline e contratos preservados

**Files:**
- Read: `apps/backend/src/modules/admin/services/admin-relatorio-tecnico-core.service.ts`
- Test: `apps/backend/src/modules/admin/admin.service.part-02.spec.ts`
- Test: `apps/backend/src/modules/admin/admin.service.part-04.spec.ts`
- Test: `apps/backend/src/modules/admin/admin.service.part-05.spec.ts`

- [ ] **Step 1: Registrar tamanho e consumidores**

```powershell
(Get-Content apps/backend/src/modules/admin/services/admin-relatorio-tecnico-core.service.ts).Count
rg -n "AdminRelatorioTecnicoCoreService" apps/backend/src/modules/admin -S
```

Expected: arquivo com 2.867 linhas e consumidores identificados.

- [ ] **Step 2: Executar baseline de build**

```powershell
npm.cmd run backend:build
```

Expected: PASS.

- [ ] **Step 3: Executar testes administrativos diretamente relacionados**

```powershell
Set-Location apps/backend
node --test -r ts-node/register src/modules/admin/admin.service.part-02.spec.ts src/modules/admin/admin.service.part-04.spec.ts src/modules/admin/admin.service.part-05.spec.ts
```

Expected: PASS antes de qualquer extração.

### Task 2: Extrair núcleo PMOC

**Files:**
- Create: `apps/backend/src/modules/admin/services/admin-pmoc-core.service.ts`
- Create: `apps/backend/src/modules/admin/services/admin-relatorio-tecnico-select.ts`
- Create: `apps/backend/src/modules/admin/services/admin-relatorio-tecnico-mapper.ts`
- Modify: `apps/backend/src/modules/admin/services/admin-relatorio-tecnico-core.service.ts`
- Modify: `apps/backend/src/modules/admin/admin.module.ts`
- Test: `apps/backend/src/modules/admin/admin.service.part-04.spec.ts`
- Test: `apps/backend/src/modules/admin/admin.service.part-05.spec.ts`

- [ ] **Step 1: Criar o serviço PMOC com contrato público preservado**

Antes do núcleo PMOC, mover literalmente `ordemRelatorioTecnicoSelect` para `admin-relatorio-tecnico-select.ts`. Mover `mapearOrdemRelatorioTecnico`, `mapearMaquinaRelatorioTecnico`, `mapearOrdensPorEquipamentoChecklist`, `unirOrdensRelatorio` e `obterPendenciasMaquinaRelatorioTecnico` para `admin-relatorio-tecnico-mapper.ts`, exportando funções com os mesmos parâmetros e retornos atuais. Cada arquivo deve permanecer abaixo de 500 linhas.

Depois criar o serviço PMOC:

```ts
@Injectable()
export class AdminPmocCoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config?: ConfigService
  ) {}

  async obterPreviaPmocCliente(clienteId: string, usuario: AuthenticatedUser) {}
  async gerarPdfPmocCliente(clienteId: string, usuario: AuthenticatedUser) {}
  async solicitarAssinaturaPmocEngenheiro(clienteId: string, usuario: AuthenticatedUser) {}
}
```

Mover sem reescrever:

- `obterPreviaPmocCliente`;
- `gerarPdfPmocCliente`;
- `solicitarAssinaturaPmocEngenheiro`;
- pendências, período, meses, prioridade e formatações PMOC;
- tipos usados exclusivamente pelo PMOC;
- integração existente com `AdminPmocPdfRendererService`.

O núcleo PMOC importa os selects e mapeadores compartilhados, sem depender do núcleo de relatório/resumo.

- [ ] **Step 2: Delegar pela fachada**

```ts
private readonly pmocCore: AdminPmocCoreService;

async obterPreviaPmocCliente(clienteId: string, usuario: AuthenticatedUser) {
  return this.pmocCore.obterPreviaPmocCliente(clienteId, usuario);
}

async gerarPdfPmocCliente(clienteId: string, usuario: AuthenticatedUser) {
  return this.pmocCore.gerarPdfPmocCliente(clienteId, usuario);
}

async solicitarAssinaturaPmocEngenheiro(clienteId: string, usuario: AuthenticatedUser) {
  return this.pmocCore.solicitarAssinaturaPmocEngenheiro(clienteId, usuario);
}
```

O construtor da fachada deve aceitar opcionalmente `AdminPmocCoreService` e criar a instância com `prisma/config` quando chamado manualmente pelos adaptadores existentes.

- [ ] **Step 3: Registrar provider**

```ts
providers: [
  AdminPmocCoreService,
  AdminRelatorioTecnicoCoreService
]
```

- [ ] **Step 4: Validar PMOC**

```powershell
npm.cmd run backend:build
Set-Location apps/backend
node --test -r ts-node/register src/modules/admin/admin.service.part-04.spec.ts src/modules/admin/admin.service.part-05.spec.ts
```

Expected: PASS com conteúdo e nomes de PDF inalterados.

- [ ] **Step 5: Commit da fase**

```powershell
git add apps/backend/src/modules/admin/services/admin-pmoc-core.service.ts apps/backend/src/modules/admin/services/admin-relatorio-tecnico-select.ts apps/backend/src/modules/admin/services/admin-relatorio-tecnico-mapper.ts apps/backend/src/modules/admin/services/admin-relatorio-tecnico-core.service.ts apps/backend/src/modules/admin/admin.module.ts
git commit -m "refactor: extrai nucleo PMOC do admin"
```

### Task 3: Extrair núcleo relatório/resumo

**Files:**
- Create: `apps/backend/src/modules/admin/services/admin-relatorio-resumo-core.service.ts`
- Modify: `apps/backend/src/modules/admin/services/admin-relatorio-tecnico-core.service.ts`
- Modify: `apps/backend/src/modules/admin/admin.module.ts`
- Test: `apps/backend/src/modules/admin/admin.service.part-02.spec.ts`
- Test: `apps/backend/src/modules/admin/admin.service.part-05.spec.ts`

- [ ] **Step 1: Criar o serviço de relatório/resumo**

```ts
@Injectable()
export class AdminRelatorioResumoCoreService {
  constructor(private readonly prisma: PrismaService) {}

  async obterRelatorios(usuario: AuthenticatedUser, referencia = new Date()) {}
  async listarRelatoriosAvulsos(usuario: AuthenticatedUser) {}
  async obterPreviaRelatorioAvulsoCliente(clienteId: string, usuario: AuthenticatedUser) {}
  async gerarPdfRelatorioAvulsoCliente(clienteId: string, usuario: AuthenticatedUser) {}
  async enviarRelatorioAvulsoCliente(clienteId: string, usuario: AuthenticatedUser) {}
  async apagarRelatorioAvulsoCliente(clienteId: string, usuario: AuthenticatedUser) {}
}
```

Mover sem reescrever:

- resumo administrativo e período de relatório;
- listagem, prévia, geração, envio e exclusão de relatório avulso;
- seleção e mapeamento de O.S./máquinas usados pelo relatório;
- PDF avulso, imagens PNG/JPEG, checklist e formatações;
- tipos usados exclusivamente pelo relatório/resumo.

- [ ] **Step 2: Delegar pela fachada**

```ts
async obterRelatorios(usuario: AuthenticatedUser, referencia = new Date()) {
  return this.relatorioResumoCore.obterRelatorios(usuario, referencia);
}

async gerarPdfRelatorioAvulsoCliente(clienteId: string, usuario: AuthenticatedUser) {
  return this.relatorioResumoCore.gerarPdfRelatorioAvulsoCliente(clienteId, usuario);
}
```

Aplicar o mesmo encaminhamento aos demais métodos públicos do domínio. O construtor deve manter fallback manual usando `prisma`.

- [ ] **Step 3: Registrar provider**

```ts
providers: [
  AdminPmocCoreService,
  AdminRelatorioResumoCoreService,
  AdminRelatorioTecnicoCoreService
]
```

- [ ] **Step 4: Validar relatório e resumo**

```powershell
npm.cmd run backend:build
Set-Location apps/backend
node --test -r ts-node/register src/modules/admin/admin.service.part-02.spec.ts src/modules/admin/admin.service.part-05.spec.ts
```

Expected: PASS com JSON, PDF, payloads e ordenação inalterados.

- [ ] **Step 5: Commit da fase**

```powershell
git add apps/backend/src/modules/admin/services/admin-relatorio-resumo-core.service.ts apps/backend/src/modules/admin/services/admin-relatorio-tecnico-core.service.ts apps/backend/src/modules/admin/admin.module.ts
git commit -m "refactor: extrai relatorios e resumo do admin"
```

### Task 4: Reduzir a fachada abaixo de 500 linhas

**Files:**
- Modify: `apps/backend/src/modules/admin/services/admin-relatorio-tecnico-core.service.ts`
- Modify only if required: `apps/backend/src/modules/admin/services/admin-relatorios.service.ts`
- Modify only if required: `apps/backend/src/modules/admin/services/admin-pmoc.service.ts`
- Modify only if required: `apps/backend/src/modules/admin/services/admin-pmoc-pdf.service.ts`

- [ ] **Step 1: Manter somente compatibilidade**

O arquivo deve conter:

```ts
@Injectable()
export class AdminRelatorioTecnicoCoreService {
  constructor(/* dependências atuais e núcleos extraídos */) {}

  // Encaminhamentos públicos preservados, sem consultas Prisma,
  // montagem de PDF, mapeamento ou regra de negócio.
}
```

Métodos de agenda, frota, clientes, equipamentos, técnicos, equipes, engenheiros, recorrência e pré-chamados continuam delegando aos serviços já existentes.

- [ ] **Step 2: Verificar limite**

```powershell
$core = (Get-Content apps/backend/src/modules/admin/services/admin-relatorio-tecnico-core.service.ts).Count
if ($core -gt 500) { throw "Core ainda possui $core linhas" }
```

Expected: até 500 linhas.

- [ ] **Step 3: Verificar arquivos novos**

```powershell
Get-ChildItem apps/backend/src/modules/admin/services -Filter *.ts |
  ForEach-Object { [pscustomobject]@{ Arquivo = $_.Name; Linhas = (Get-Content $_.FullName).Count } } |
  Sort-Object Linhas -Descending
```

Expected: somente `admin-pmoc-core.service.ts` e `admin-relatorio-resumo-core.service.ts` estão autorizados a ultrapassar 500 linhas nesta entrega.

- [ ] **Step 4: Commit da fachada**

```powershell
git add apps/backend/src/modules/admin/services
git commit -m "refactor: reduz fachada de relatorios admin"
```

### Task 5: Estabilização completa

**Files:**
- Verify: `apps/backend/src/modules/admin/**/*.ts`

- [ ] **Step 1: Build**

```powershell
npm.cmd run backend:build
```

Expected: PASS.

- [ ] **Step 2: Testes administrativos**

```powershell
Set-Location apps/backend
node --test -r ts-node/register src/modules/admin/admin.service.part-01.spec.ts src/modules/admin/admin.service.part-02.spec.ts src/modules/admin/admin.service.part-03.spec.ts src/modules/admin/admin.service.part-04.spec.ts src/modules/admin/admin.service.part-05.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Suíte backend**

```powershell
npm.cmd run backend:test
```

Expected: PASS.

- [ ] **Step 4: Qualidade final**

```powershell
npm.cmd run backend:lint
git diff --check
git status --short
```

Expected: lint sem erros novos, diff válido e apenas arquivos desta refatoração.
