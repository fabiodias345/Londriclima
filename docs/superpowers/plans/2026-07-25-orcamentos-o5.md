# Orçamentos O5 Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with review checkpoints. Each task is independently testable and must preserve the scope restriction to `apps/admin` and `apps/backend`.

**Goal:** Entregar revisão, PDF, envio por WhatsApp/e-mail e assinatura Assinafy para orçamentos no painel administrativo web.

**Architecture:** O módulo comercial será a fronteira dos casos de uso. O backend carregará o orçamento completo, calculará e renderizará o PDF, validará pré-condições e só persistirá o resultado depois do sucesso da integração externa. Os clientes de WhatsApp, SMTP e Assinafy permanecerão atrás de interfaces/adapters próprios do comercial, sem reutilizar payloads de PMOC.

**Tech Stack:** NestJS, Prisma/PostgreSQL, TypeScript, PDF writer existente, WhatsApp Cloud existente, SMTP próprio, Axios/Assinafy existente, JavaScript modular e CSS do painel web.

---

## Mapa de arquivos

- Modify: `apps/backend/prisma/schema.prisma` — campos comerciais para canais, PDF e assinatura.
- Create: `apps/backend/prisma/migrations/20260725170000_orcamento_canais_assinatura/migration.sql` — migration dos novos campos.
- Create: `apps/backend/src/modules/comercial/comercial-orcamento-integrations.ts` — contratos e payloads dos canais comerciais.
- Create: `apps/backend/src/modules/comercial/comercial-assinafy.service.ts` — criação do documento comercial no Assinafy, sem PMOC.
- Modify: `apps/backend/src/modules/comercial/comercial.module.ts` — registrar dependências e providers.
- Modify: `apps/backend/src/modules/comercial/comercial.service.ts` — detalhe, PDF, e-mail, WhatsApp, Assinafy e persistência.
- Modify: `apps/backend/src/modules/comercial/comercial.controller.ts` — endpoints autenticados das ações.
- Modify: `apps/backend/src/modules/comercial/dto/comercial.dto.ts` — DTO de envio por e-mail e mudança de status, incluindo `IsEmail` no import de `class-validator`.
- Create: `apps/backend/src/modules/comercial/comercial.service.spec.ts` — testes isolados do fluxo comercial.
- Modify: `apps/admin/js/modules/comercial.js` — detalhe do orçamento e ações.
- Modify: `apps/admin/css/comercial.css` — detalhe, status, ações e responsividade.

Não modificar `apps/admin_mobile`, `apps/mobile` ou arquivos Flutter.

### Task 1: Adicionar persistência comercial

**Files:**
- Modify: `apps/backend/prisma/schema.prisma:883-910`
- Create: `apps/backend/prisma/migrations/20260725170000_orcamento_canais_assinatura/migration.sql`

- [ ] **Step 1: Escrever os campos comerciais no modelo Prisma**

Adicionar ao modelo `Orcamento`, mantendo os nomes de PMOC fora do modelo:

```prisma
  pdfGeradoEm              DateTime? @map("pdf_gerado_em")
  ultimoEnvioCanal         String?   @map("ultimo_envio_canal")
  ultimoEnvioEm            DateTime? @map("ultimo_envio_em")
  emailEnvio               String?   @map("email_envio")
  assinafyDocumentId       String?   @unique @map("assinafy_document_id")
  assinafyAssignmentId     String?   @map("assinafy_assignment_id")
  assinafyStatus           String?   @map("assinafy_status")
  assinafyUltimoEvento     Json?     @map("assinafy_ultimo_evento")
  assinafyIniciadoEm       DateTime? @map("assinafy_iniciado_em")
```

- [ ] **Step 2: Criar a migration SQL**

Gerar SQL equivalente aos campos acima, incluindo índice único para `assinafy_document_id` e `DROP/ADD` somente se o banco ainda não tiver esses nomes. A migration não deve tocar em `pmoc_relatorios`.

- [ ] **Step 3: Regenerar o client e verificar o schema**

Run: `npm.cmd run prisma:generate` em `apps/backend`  
Expected: Prisma Client gerado sem erro.

- [ ] **Step 4: Verificar a migration**

Run: `npx prisma validate` em `apps/backend`  
Expected: `The schema ... is valid`.

### Task 2: Criar contratos dos canais comerciais

**Files:**
- Create: `apps/backend/src/modules/comercial/comercial-orcamento-integrations.ts`
- Create: `apps/backend/src/modules/comercial/comercial-assinafy.service.ts`
- Modify: `apps/backend/src/modules/comercial/comercial.module.ts`

- [ ] **Step 1: Definir os contratos de integração**

Criar tipos pequenos e testáveis:

```ts
export type OrcamentoDocumento = {
  filename: string;
  content: Buffer;
  contentType: "application/pdf";
};

export interface OrcamentoWhatsAppSender {
  enviarDocumento(to: string, documento: OrcamentoDocumento, caption: string): Promise<{ messageId?: string }>;
  enviarAprovacao(to: string, orcamentoId: string, texto: string): Promise<{ messageId?: string }>;
}

export interface OrcamentoEmailSender {
  enviar(message: {
    from: string;
    to: string;
    subject: string;
    text: string;
    attachments: Array<{ filename: string; contentType: string; contentBase64: string }>;
  }): Promise<unknown>;
}
```

O adapter WhatsApp delegará ao `WhatsAppCloudService`; o adapter de e-mail delegará ao `SmtpEmailService`.

- [ ] **Step 2: Implementar o Assinafy comercial**

`ComercialAssinafyService.enviarOrcamento(orcamento, pdf)` deve:

```ts
if (Number(orcamento.total) <= 2000) {
  throw new BadRequestException("Assinafy exige orçamento acima de R$ 2.000,00.");
}
if (!orcamento.cliente.email) {
  throw new BadRequestException("Cliente sem e-mail para assinatura.");
}
```

Depois deve criar o documento via `/accounts/{accountId}/documents`, criar a atribuição ao signatário do cliente, retornar `documentId`, `assignmentId`, `status` e o evento bruto. O serviço pode compartilhar helpers HTTP do módulo de assinaturas, mas não pode chamar `AdminService.obterPreviaPmocCliente`, criar `PmocRelatorio` ou enviar payload de PMOC.

- [ ] **Step 3: Registrar dependências sem alterar o fluxo PMOC**

Adicionar os providers comerciais ao `ComercialModule`. Se o adapter precisar do SMTP/WhatsApp, importar `AutomacoesModule`; se precisar de cliente Assinafy comum, extrair o cliente HTTP para um provider compartilhado e manter `AssinafyService` compatível.

- [ ] **Step 4: Criar teste unitário do limiar Assinafy**

Cobrir `2000`, `2000.01` e `1999.99`, além de cliente sem e-mail. O teste deve afirmar que valores até R$ 2.000 não fazem chamada HTTP.

### Task 3: Implementar API de detalhe, PDF e envio

**Files:**
- Modify: `apps/backend/src/modules/comercial/dto/comercial.dto.ts`
- Modify: `apps/backend/src/modules/comercial/comercial.service.ts`
- Modify: `apps/backend/src/modules/comercial/comercial.controller.ts`
- Test: `apps/backend/src/modules/comercial/comercial.service.spec.ts`

- [ ] **Step 1: Adicionar DTO de e-mail**

```ts
export class EnviarOrcamentoEmailDto {
  @IsEmail()
  @IsOptional()
  destinatario?: string;
}
```

Quando omitido, usar `cliente.email`; quando informado, validar e não persistir um endereço diferente como cadastro do cliente.

- [ ] **Step 2: Criar carregador único do orçamento**

Implementar `obterOrcamentoOperacional(id, empresaId)` com `empresa`, `cliente`, endereço principal, `conversa` e `itens`. Retornar `NotFoundException` para outra empresa ou ID inexistente. Esse carregador será usado por detalhe, PDF e canais para impedir cálculos divergentes.

- [ ] **Step 3: Expor detalhe autenticado**

Adicionar:

```ts
@Get("orcamentos/:id")
obterOrcamento(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() usuario: AuthenticatedUser) {
  return this.comercialService.obterOrcamento(id, usuario.empresa_id);
}
```

Retornar totais como dados do Prisma e metadados de disponibilidade das ações.

- [ ] **Step 4: Expor PDF autenticado**

Adicionar `GET /admin/comercial/orcamentos/:id/pdf`, gerar o buffer pelo `ComercialOrcamentoPdfRenderer`, atualizar somente `pdfGeradoEm` e responder com `Content-Type: application/pdf` e `Content-Disposition: inline; filename="orcamento-{id}.pdf"`.

- [ ] **Step 5: Separar envio WhatsApp do endpoint legado**

Adicionar `POST /orcamentos/:id/enviar-whatsapp`. Validar telefone, gerar PDF, enviar documento e mensagem de aprovação. Só depois do retorno dos dois envios atualizar `status=aguardando_aprovacao`, `ultimoEnvioCanal="whatsapp"`, `ultimoEnvioEm` e `enviadoEm`. O endpoint `/enviar` legado deve delegar para o novo método para não manter dois comportamentos.

- [ ] **Step 6: Implementar envio de e-mail**

Adicionar `POST /orcamentos/:id/enviar-email` usando `EnviarOrcamentoEmailDto`. Montar o e-mail com assunto `Orçamento {titulo} — AIRMOVEBR`, corpo comercial e anexo Base64 do PDF. Só persistir canal/status após sucesso do SMTP.

- [ ] **Step 7: Implementar início de Assinafy**

Adicionar `POST /orcamentos/:id/assinafy`. Validar `total > 2000`, e-mail e ausência de assinatura ativa duplicada; chamar `ComercialAssinafyService`; persistir IDs/status/evento/timestamp em transação. Falha externa não pode alterar status nem criar registro parcial.

- [ ] **Step 8: Testar as invariantes do service**

Em `comercial.service.spec.ts`, usar Prisma/senders falsos e verificar:

```ts
assert.equal(prisma.orcamento.update.mock.calls.length, 0); // quando o sender falhar
assert.equal(resposta.status, "aguardando_aprovacao"); // somente após sucesso
assert.equal(resposta.assinafy_document_id, "doc-orcamento-1");
```

Cobrir isolamento por `empresaId`, telefone/e-mail ausentes, PDF, WhatsApp, SMTP, Assinafy e repetição com assinatura já existente.

### Task 4: Implementar detalhe e ações no painel web

**Files:**
- Modify: `apps/admin/js/modules/comercial.js`
- Modify: `apps/admin/css/comercial.css`

- [ ] **Step 1: Adicionar estado de seleção e carregamento**

Adicionar `selectedCommercialQuote` e funções `loadCommercialQuote(id)`, `renderCommercialQuoteDetail()` e `closeCommercialQuoteDetail()`. O carregador deve chamar `GET /admin/comercial/orcamentos/{id}` com `authHeaders()` e renderizar erro no painel.

- [ ] **Step 2: Tornar cada item da listagem acionável**

Adicionar `data-orcamento-id` ao `<article class="quote-item">` e listener que abre o detalhe sem perder filtros/busca.

- [ ] **Step 3: Renderizar detalhe e ações condicionais**

O template deve exibir cliente, validade, itens, subtotal, desconto, total, observações e status. As ações devem chamar:

```js
GET  /admin/comercial/orcamentos/:id/pdf
POST /admin/comercial/orcamentos/:id/enviar-whatsapp
POST /admin/comercial/orcamentos/:id/enviar-email
POST /admin/comercial/orcamentos/:id/assinafy
```

Enviar e-mail deve abrir um pequeno formulário/confirmação com o e-mail existente preenchido. Assinafy deve ficar disponível apenas para `Number(total) > 2000`, mostrando mensagem informativa nos demais casos.

- [ ] **Step 4: Atualizar a tela depois das ações**

Desabilitar o botão durante o `fetch`, mostrar resultado textual, recarregar detalhe e listagem em sucesso e preservar o orçamento selecionado em caso de erro.

- [ ] **Step 5: Ajustar estilos responsivos**

Adicionar classes para detalhe, linhas de itens, bloco de totais, ações e mensagens. Em `max-width: 720px`, empilhar ações e itens; manter contraste mínimo e foco visível seguindo os padrões existentes do painel.

### Task 5: Validar e fechar a fase

**Files:**
- Modify only if tests reveal defects in the files above.

- [ ] **Step 1: Rodar testes comerciais backend**

Run: `npm.cmd test -- --test-name-pattern=comercial` em `apps/backend`  
Expected: todos os testes comerciais aprovados.

- [ ] **Step 2: Rodar suíte backend completa**

Run: `npm.cmd test` em `apps/backend`  
Expected: suíte existente sem falhas.

- [ ] **Step 3: Rodar validações de TypeScript/lint**

Run: `npm.cmd run build` e `npm.cmd run lint` em `apps/backend`  
Expected: build e lint sem erro introduzido pela O5.

- [ ] **Step 4: Rodar testes frontend**

Run: `npm.cmd run frontend:test` na raiz do workspace  
Expected: testes frontend aprovados, incluindo abertura do detalhe, estados e ações.

- [ ] **Step 5: Verificar escopo e Git**

Run: `git status --short` e `rg -n "apps/admin_mobile|apps/mobile" docs/superpowers/plans/2026-07-25-orcamentos-o5.md`  
Expected: somente arquivos de `apps/admin`, `apps/backend`, migration, spec/plan e nenhum Flutter alterado.

- [ ] **Step 6: Commitar a implementação validada**

```powershell
git add apps/admin apps/backend
git commit -m "feat: completa fase O5 de orcamentos"
```

## Revisão do plano

- **Cobertura:** detalhe, PDF, WhatsApp, e-mail, Assinafy, regra de R$ 2.000, persistência, autorização, erros, responsividade e validações estão cobertos nas Tasks 1–5.
- **Completude:** não há etapas sem arquivo, comando ou resultado esperado.
- **Consistência:** os endpoints usados pelo painel são os mesmos definidos no controller; os campos comerciais usados pelo service correspondem ao modelo Prisma da Task 1.
- **Escopo:** nenhuma tarefa altera Flutter, APK ou conversão em O.S.; conversão permanece na O6.
