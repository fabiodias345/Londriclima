# Gestao de Acessos e Convites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir a lista de acessos, entregar uma interface organizada para cadastro e convites, enviar convites por SMTP e excluir usuarios definitivamente sem apagar historicos operacionais.

**Architecture:** O admin estatico continua dividido entre HTML, CSS e modulos JavaScript concatenados. O backend NestJS concentra convite e envio em `AdminConvitesTecnicoService`; as FKs de `Usuario` usam `SetNull` para historicos e `Cascade` para dados pessoais ou vinculos, permitindo exclusao atomica do cadastro.

**Tech Stack:** HTML/CSS/JavaScript, NestJS, Prisma/PostgreSQL, SMTP, Node test runner.

---

### Task 1: Contratos relacionais para exclusao definitiva

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/20260704120000_usuario_exclusao_definitiva/migration.sql`
- Modify: `apps/backend/src/modules/auth/funcionario-storage.service.ts`
- Test: `apps/backend/src/modules/admin/services/admin-tecnicos.service.spec.ts`

- [ ] **Step 1: Escrever testes de exclusao**

Cobrir bloqueio do proprio usuario, bloqueio do unico admin e chamada de `usuario.delete`, confirmando que o retorno e `{ id, apagado: true }`.

- [ ] **Step 2: Executar o teste e confirmar falha**

```powershell
npm run backend:test -- --test-name-pattern="apagarTecnico"
```

Expected: FAIL porque o servico ainda executa `usuario.update({ ativo: false })`.

- [ ] **Step 3: Definir as regras de FK**

Usar `onDelete: SetNull` nas relacoes historicas opcionais (`OrdemServico`, eventos, seguranca, abastecimentos, PMOC e convites) e `onDelete: Cascade` em documentos e membros de equipe. Tornar nullable apenas as FKs historicas hoje obrigatorias: `PmocRelatorio.criadoPorUsuarioId` e `ConviteTecnico.criadoPorId`.

- [ ] **Step 4: Implementar limpeza segura do storage**

Adicionar `FuncionarioStorageService.apagarCadastro({ empresaId, usuarioId })`, resolvendo somente `storage/funcionarios/<empresa>/<usuario>` e usando remocao recursiva idempotente.

- [ ] **Step 5: Implementar exclusao definitiva**

Em `AdminTecnicosService.apagarTecnico`, recusar `tecnicoId === usuario.id`, preservar a protecao do unico admin, executar `prisma.usuario.delete` e limpar o storage depois da transacao.

- [ ] **Step 6: Gerar Prisma e validar testes**

```powershell
npm run backend:prisma:generate
npm run backend:test -- --test-name-pattern="apagarTecnico"
```

Expected: PASS.

### Task 2: Encaminhamento de convite por email

**Files:**
- Create: `apps/backend/src/modules/admin/dto/encaminhar-convite-tecnico.dto.ts`
- Modify: `apps/backend/src/modules/admin/services/admin-convites-tecnico.service.ts`
- Modify: `apps/backend/src/modules/admin/services/admin-convites-tecnico.service.spec.ts`
- Modify: `apps/backend/src/modules/admin/admin.service.ts`
- Modify: `apps/backend/src/modules/admin/admin.controller.ts`
- Modify: `apps/backend/src/modules/admin/admin.module.ts`
- Modify: `apps/backend/src/modules/automacoes/automacoes.module.ts`

- [ ] **Step 1: Escrever testes do envio**

Cobrir convite pendente com hash correspondente, email enviado com codigo e validade, recusa de codigo divergente e preservacao do convite quando o SMTP falhar.

- [ ] **Step 2: Executar o teste e confirmar falha**

```powershell
npm run backend:test -- --test-name-pattern="encaminhar convite"
```

Expected: FAIL porque o metodo ainda nao existe.

- [ ] **Step 3: Criar DTO validado**

```ts
export class EncaminharConviteTecnicoDto {
  @IsEmail() email!: string;
  @IsString() @IsNotEmpty() codigo!: string;
}
```

- [ ] **Step 4: Implementar envio SMTP**

Validar empresa, estado pendente e `hashCodigoConvite(dto.codigo) === convite.codigoHash`; enviar assunto `Convite para acesso AIRMOVEBR` com codigo, validade e instrucao para usar **Primeiro cadastro** no aplicativo.

- [ ] **Step 5: Expor endpoint administrativo**

Adicionar `POST /admin/convites-tecnico/:conviteId/email`, delegacao em `AdminService`, exportar `SmtpEmailService` e importar `AutomacoesModule` no modulo admin.

- [ ] **Step 6: Executar testes do convite**

```powershell
npm run backend:test -- --test-name-pattern="convite"
```

Expected: PASS.

### Task 3: Interface profissional de Acessos

**Files:**
- Modify: `apps/admin/index.html`
- Modify: `apps/admin/css/clientes.css`
- Modify: `apps/admin/css/responsive.css`
- Modify: `apps/admin/js/modules/api.js`
- Modify: `apps/admin/js/modules/clientes.js`
- Modify: `apps/admin/js/modules/bootstrap.js`
- Modify: `apps/admin/js/modules/eventos.js`
- Modify: `apps/admin/js/modules/ui/dom.js`
- Test: `tests/frontend-contracts.test.js`

- [ ] **Step 1: Escrever contratos frontend**

Exigir os botoes `Cadastrar acesso` e `Gerar convite`, paineis alternaveis, formulario de email, WhatsApp desabilitado, confirmacao definitiva e variaveis de cadastro definidas dentro de `renderTecnicos`.

- [ ] **Step 2: Executar teste e confirmar falha**

```powershell
npm run frontend:test
```

Expected: FAIL nos novos contratos.

- [ ] **Step 3: Reorganizar o HTML**

Manter a lista no corpo principal; mover cadastro e convite para paineis independentes e ocultos; apos geracao mostrar codigo, validade, copia, email e WhatsApp indisponivel.

- [ ] **Step 4: Corrigir e completar o JavaScript**

Definir `cadastroStatus` e `documentoBotao` dentro do loop de `renderTecnicos`; implementar alternancia dos paineis, envio por email, estados de carregamento e confirmacao via `window.confirm` antes do DELETE.

- [ ] **Step 5: Aplicar o visual aprovado B**

Criar classes `access-toolbar`, `access-panel`, `invite-result` e `invite-channels`, com grid responsivo, espacamento consistente e nenhum posicionamento absoluto.

- [ ] **Step 6: Executar contratos frontend**

```powershell
npm run frontend:test
```

Expected: PASS.

### Task 4: Bundle, verificacao integrada e acabamento

**Files:**
- Modify: `apps/admin/js/main.js`
- Modify: `apps/admin/index.html`

- [ ] **Step 1: Atualizar cache-busting dos modulos**

Trocar a versao `20260703-invites` por `20260704-access` no carregador e no HTML sem editar a ordem dos modulos.

- [ ] **Step 2: Executar validacoes completas**

```powershell
npm run frontend:test
npm run backend:build
npm run backend:test
git diff --check
```

Expected: todos os comandos concluem sem erros.

- [ ] **Step 3: Revisar escopo final**

Confirmar que o WhatsApp nao realiza chamada externa e aparece como aguardando Meta; confirmar que o codigo permanece copiavel mesmo quando o email falha.
