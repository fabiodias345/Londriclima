# Envio, assinatura e PDF de orçamentos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Oferecer os canais corretos de orçamento por faixa de valor e gerar PDFs comerciais legíveis, paginados e com português correto.

**Architecture:** `ComercialService` continuará sendo a fronteira das regras de canal e fará a validação de valor antes de qualquer envio externo. O renderer comercial passará a construir páginas com linhas medidas e área útil fixa. O painel de Orçamentos e a central WhatsApp reutilizarão um contrato visual de ações calculado pelo backend, sem usar o endpoint legado `/enviar`.

**Tech Stack:** NestJS, TypeScript, Prisma, renderer PDF interno, SMTP, WhatsApp Cloud, Assinafy, JavaScript modular e testes `node:test`.

---

## Status de execução — 26/07/2026

- Implementadas as regras de canal no backend, o renderer paginado do PDF e as ações do painel de Orçamentos e da central WhatsApp.
- Validações concluídas: 7 testes comerciais, 2 testes do renderer PDF, 27 testes frontend e build backend.
- Pendente antes de publicar: validação visual de um PDF autenticado em ambiente real e deploy controlado.

## Mapa de arquivos

- Modify: `apps/backend/src/modules/comercial/comercial.service.ts` — regras de canal por valor, mensagens e ações disponíveis.
- Modify: `apps/backend/src/modules/comercial/comercial.service.spec.ts` — cobertura de limites e ausência de efeitos externos.
- Modify: `apps/backend/src/modules/comercial/comercial-orcamento-pdf-renderer.ts` — layout paginado, texto em português e quebra de linhas.
- Create: `apps/backend/src/modules/comercial/comercial-orcamento-pdf-renderer.spec.ts` — testes do conteúdo e da paginação do PDF.
- Modify: `apps/admin/js/modules/comercial.js` — ações condicionais no detalhe do orçamento.
- Modify: `apps/admin/js/modules/whatsapp.js` — ações condicionais no cartão de orçamento da conversa e remoção do endpoint legado.
- Modify: `tests/frontend-contracts.test.js` — contratos de botões e rotas corretas.
- Modify: `docs/resumo.md` — registrar a fase e o próximo checkpoint.

Não modificar `apps/admin_mobile`, `apps/mobile`, Flutter, APK, PMOC ou schema Prisma.

### Task 1: Restringir canais comerciais no backend

**Files:**
- Modify: `apps/backend/src/modules/comercial/comercial.service.ts:75-124`
- Modify: `apps/backend/src/modules/comercial/comercial.service.spec.ts`

- [ ] **Step 1: Escrever testes que definem os limites de canal**

Adicionar ao spec um orçamento-base parametrizável e os testes abaixo:

```ts
test("orçamento de R$ 2.000,00 permite WhatsApp e e-mail, mas não assinatura", async () => {
  const { service } = criarService({ total: 2000 });
  const resultado = await service.obterOrcamento("11111111-1111-4111-8111-111111111111", "empresa-1");
  assert.equal(resultado.acoes.whatsapp, true);
  assert.equal(resultado.acoes.email, true);
  assert.equal(resultado.acoes.assinafy, false);
});

test("orçamento de R$ 2.000,01 permite somente assinatura por e-mail", async () => {
  const { service } = criarService({ total: 2000.01 });
  const resultado = await service.obterOrcamento("11111111-1111-4111-8111-111111111111", "empresa-1");
  assert.equal(resultado.acoes.whatsapp, false);
  assert.equal(resultado.acoes.email, false);
  assert.equal(resultado.acoes.assinafy, true);
});
```

- [ ] **Step 2: Executar o spec para confirmar a falha inicial**

Run: `node.exe --test -r ts-node/register "src/modules/comercial/comercial.service.spec.ts"` em `apps/backend`.

Expected: FAIL, porque `acoes.whatsapp` e `acoes.email` ainda são verdadeiros acima de R$ 2.000,00.

- [ ] **Step 3: Centralizar a regra de canais no service**

Adicionar helpers privados e usá-los em `obterOrcamento`, `enviarWhatsApp` e `enviarEmail`:

```ts
private exigeAssinatura(total: unknown) { return Number(total) > 2000; }

private validarCanalDireto(orcamento: { total: unknown }) {
  if (this.exigeAssinatura(orcamento.total)) {
    throw new BadRequestException("Orçamentos acima de R$ 2.000,00 devem ser enviados para assinatura por e-mail.");
  }
}
```

`enviarWhatsApp` e `enviarEmail` devem chamar `validarCanalDireto` antes de gerar PDF ou invocar WhatsApp/SMTP. `obterOrcamento` deve retornar `acoes` como:

```ts
const assinaturaObrigatoria = this.exigeAssinatura(orcamento.total);
return {
  ...orcamento,
  acoes: {
    pdf: true,
    whatsapp: !assinaturaObrigatoria && Boolean(orcamento.conversa?.telefone || orcamento.cliente.telefone),
    email: !assinaturaObrigatoria && Boolean(orcamento.cliente.email),
    assinafy: assinaturaObrigatoria && Boolean(orcamento.cliente.email) && !orcamento.assinafyDocumentId
  }
};
```

- [ ] **Step 4: Melhorar a mensagem de assinatura**

Em `enviarAssinafy`, manter o PDF e a persistência atuais, mas retornar uma mensagem operacional:

```ts
return {
  enviado: true,
  canal: "assinatura_email",
  mensagem: "O cliente receberá um e-mail para assinar digitalmente.",
  status: salvo.status,
  assinafy_document_id: resultado.documentId,
  assinafy_assignment_id: resultado.assignmentId,
  assinafy_status: resultado.status
};
```

- [ ] **Step 5: Cobrir rejeição sem efeitos externos e executar o spec**

Adicionar testes que chamam `enviarWhatsApp` e `enviarEmail` com total `2000.01`, verificando `assert.rejects` e que nenhum sender nem `prisma.orcamento.update` foi chamado. Executar o comando do passo 2.

Expected: PASS em todos os testes comerciais.

- [ ] **Step 6: Commitar a regra de canais**

```powershell
git add apps/backend/src/modules/comercial/comercial.service.ts apps/backend/src/modules/comercial/comercial.service.spec.ts
git commit -m "feat: restringe canais de orcamento por assinatura"
```

### Task 2: Reestruturar o renderer do PDF comercial

**Files:**
- Modify: `apps/backend/src/modules/comercial/comercial-orcamento-pdf-renderer.ts`
- Create: `apps/backend/src/modules/comercial/comercial-orcamento-pdf-renderer.spec.ts`

- [ ] **Step 1: Criar testes de português e múltiplas páginas**

Criar um `OrcamentoPdfInput` com `"Instalação e manutenção de ar-condicionado"`, cliente `"João da Silva"` e 35 itens. Os testes devem inspecionar o buffer em `latin1`:

```ts
test("PDF preserva caracteres em português", () => {
  const pdf = new ComercialOrcamentoPdfRenderer().gerar(criarInput());
  const conteudo = pdf.toString("latin1");
  assert.match(conteudo, /Instalação e manutenção/);
  assert.doesNotMatch(conteudo, /InstalaÃ§Ã£o|manutenÃ§Ã£o/);
});

test("PDF cria outra página para lista longa de itens", () => {
  const pdf = new ComercialOrcamentoPdfRenderer().gerar(criarInput({ quantidadeItens: 35 }));
  assert.match(pdf.toString("latin1"), /\/Count 2/);
});
```

- [ ] **Step 2: Executar o teste para confirmar a falha inicial**

Run: `node.exe --test -r ts-node/register "src/modules/comercial/comercial-orcamento-pdf-renderer.spec.ts"` em `apps/backend`.

Expected: FAIL, pois o renderer atual contém textos corrompidos e produz apenas uma página.

- [ ] **Step 3: Implementar linhas e páginas com área útil reservada**

Substituir o desenho de página única por helpers que retornam a próxima posição vertical e abrem nova página quando a próxima linha invadir a área de rodapé:

```ts
const PAGE_TOP = 806;
const FOOTER_Y = 42;
const CONTENT_BOTTOM = 68;

private quebrarTexto(value: string, maxChars: number) {
  const words = value.trim().split(/\s+/);
  return words.reduce<string[]>((lines, word) => {
    const current = lines.at(-1) || "";
    if (!current || `${current} ${word}`.length > maxChars) lines.push(word);
    else lines[lines.length - 1] = `${current} ${word}`;
    return lines;
  }, []);
}

private precisaNovaPagina(y: number, altura: number) {
  return y - altura < CONTENT_BOTTOM;
}
```

`gerar` deve manter `pages: PdfPage[]`, criar o cabeçalho em cada página, repetir `tableHeader` nas páginas seguintes e adicionar subtotal/desconto/total/validade somente depois do último item. O rodapé deve ser emitido em todas as páginas na faixa `y=34` e `y=20`.

- [ ] **Step 4: Corrigir todas as strings do renderer**

Trocar os literais corrompidos por texto UTF-8 de origem, incluindo `Emissão`, `CNPJ: não informado`, `Contato não informado`, `Endereço não informado`, `DESCRIÇÃO`, `UNITÁRIO`, `Após sua aprovação` e `ordem de serviço`.

Manter `escape` compatível com a fonte WinAnsi:

```ts
private escape(value: string) {
  return value.replace(/[\\()]/g, "\\$&").replace(/[^\x20-\xff]/g, "?");
}
```

- [ ] **Step 5: Executar os testes do renderer e gerar uma amostra local**

Run: `node.exe --test -r ts-node/register "src/modules/comercial/comercial-orcamento-pdf-renderer.spec.ts"` em `apps/backend`.

Expected: PASS com uma página para entrada curta e duas páginas para 35 itens.

Depois, usar o endpoint autenticado local de PDF ou um teste de integração para abrir uma amostra contendo título longo, endereço longo e 35 itens; conferir visualmente que não há sobreposição, que o cabeçalho da tabela reaparece na página 2 e que todos os textos têm acento correto.

- [ ] **Step 6: Commitar o renderer validado**

```powershell
git add apps/backend/src/modules/comercial/comercial-orcamento-pdf-renderer.ts apps/backend/src/modules/comercial/comercial-orcamento-pdf-renderer.spec.ts
git commit -m "fix: corrige layout e textos do PDF comercial"
```

### Task 3: Ajustar as ações do painel de Orçamentos

**Files:**
- Modify: `apps/admin/js/modules/comercial.js:130-210`
- Modify: `tests/frontend-contracts.test.js`

- [ ] **Step 1: Adicionar contratos frontend para as faixas de valor**

Adicionar um teste que carregue `comercial.js` e valide os nomes e os endpoints:

```js
assert.match(comercial, /Enviar por WhatsApp/);
assert.match(comercial, /Enviar por e-mail/);
assert.match(comercial, /Enviar para assinatura por e-mail/);
assert.match(comercial, /enviar-whatsapp/);
assert.match(comercial, /enviar-email/);
assert.match(comercial, /assinafy/);
```

- [ ] **Step 2: Executar o contrato para confirmar a falha inicial**

Run: `npm.cmd run frontend:test` na raiz.

Expected: FAIL, pois o botão atual se chama `Enviar Assinafy` e a tela não separa as ações pela faixa de total.

- [ ] **Step 3: Renderizar ações mutuamente exclusivas**

Em `renderCommercialQuoteDetail`, calcular:

```js
const assinaturaObrigatoria = Number(quote.total) > 2000;
const acoesEnvio = assinaturaObrigatoria
  ? '<button type="button" data-orcamento-action="assinafy" ' + (quote.acoes?.assinafy ? '' : 'disabled') + '>Enviar para assinatura por e-mail</button><p class="comercial-detail-hint">O cliente receberá um e-mail para assinar digitalmente.</p>'
  : '<button type="button" data-orcamento-action="whatsapp" ' + (quote.acoes?.whatsapp ? '' : 'disabled') + '>Enviar por WhatsApp</button><button type="button" data-orcamento-action="email" ' + (quote.acoes?.email ? '' : 'disabled') + '>Enviar por e-mail</button>';
```

Inserir `acoesEnvio` ao lado de `Baixar PDF`. Manter o prompt de destinatário no envio de e-mail direto e atualizar a mensagem de sucesso a partir de `result.mensagem || "Envio concluído."`.

- [ ] **Step 4: Executar os contratos frontend**

Run: `npm.cmd run frontend:test` na raiz.

Expected: PASS, sem alterar os contratos existentes de navegação e catálogo.

- [ ] **Step 5: Commitar a interface comercial**

```powershell
git add apps/admin/js/modules/comercial.js tests/frontend-contracts.test.js
git commit -m "feat: mostra canais corretos no detalhe do orcamento"
```

### Task 4: Ajustar ações de orçamento na central WhatsApp

**Files:**
- Modify: `apps/admin/js/modules/whatsapp.js:115-121,187`
- Modify: `tests/frontend-contracts.test.js`

- [ ] **Step 1: Escrever contrato contra o endpoint legado**

Adicionar ao teste de frontend:

```js
assert.match(whatsapp, /data-whatsapp-action="enviar-orcamento-whatsapp"/);
assert.match(whatsapp, /data-whatsapp-action="enviar-orcamento-email"/);
assert.match(whatsapp, /data-whatsapp-action="enviar-orcamento-assinatura"/);
assert.doesNotMatch(whatsapp, /orcamentos\/\$\{event\.target\.dataset\.orcamentoId\}\/enviar`/);
```

- [ ] **Step 2: Executar o contrato para confirmar a falha inicial**

Run: `npm.cmd run frontend:test` na raiz.

Expected: FAIL, pois a ação atual usa `data-whatsapp-action="enviar-orcamento"` e `POST /enviar`.

- [ ] **Step 3: Trocar o cartão e o listener pelos três canais explícitos**

Em `quoteForm`, usar `Number(quote.total) > 2000` para renderizar somente `Enviar para assinatura por e-mail` para valores altos; nos demais, renderizar `Enviar por WhatsApp` e `Enviar por e-mail`.

No listener de clique, mapear as ações sem endpoint legado:

```js
const endpoints = {
  "enviar-orcamento-whatsapp": "enviar-whatsapp",
  "enviar-orcamento-email": "enviar-email",
  "enviar-orcamento-assinatura": "assinafy"
};
const endpoint = endpoints[action];
const body = action === "enviar-orcamento-email"
  ? JSON.stringify({ destinatario: window.prompt("E-mail para envio:", quote.cliente?.email || "") || "" })
  : undefined;
```

Cancelar sem fazer `fetch` quando o prompt de e-mail retornar vazio. Em sucesso, recarregar a conversa e a lista; em erro, apresentar a mensagem retornada pelo backend.

- [ ] **Step 4: Executar contratos frontend e verificação de sintaxe**

Run: `node.exe --check apps/admin/js/modules/whatsapp.js` e `npm.cmd run frontend:test` na raiz.

Expected: sintaxe válida e todos os contratos aprovados.

- [ ] **Step 5: Commitar a central WhatsApp**

```powershell
git add apps/admin/js/modules/whatsapp.js tests/frontend-contracts.test.js
git commit -m "feat: separa canais de orcamento no WhatsApp"
```

### Task 5: Validar, documentar e encerrar a fase

**Files:**
- Modify: `docs/resumo.md`

- [ ] **Step 1: Executar a suíte comercial e o build**

Run: `node.exe --test -r ts-node/register "src/modules/comercial/*.spec.ts"` em `apps/backend`, depois `npm.cmd run backend:build` na raiz.

Expected: specs comerciais e build aprovados.

- [ ] **Step 2: Executar a suíte backend e frontend completa**

Run: `npm.cmd run backend:test` e `npm.cmd run frontend:test` na raiz.

Expected: nenhuma falha. Registrar separadamente logs conhecidos do scheduler caso apareçam sem falhar testes.

- [ ] **Step 3: Atualizar o resumo do projeto**

Em `docs/resumo.md`, atualizar a data, registrar esta melhoria no estado atual e definir o próximo checkpoint comercial. Não remover fatos históricos ou alterar o escopo que exclui Flutter/APK.

- [ ] **Step 4: Verificar o diff e o escopo**

Run: `git diff --check` e `git status --short`.

Expected: sem erro de whitespace e mudanças limitadas aos arquivos do mapa desta fase, além dos commits gerados nas tarefas anteriores.

- [ ] **Step 5: Commitar a documentação de encerramento**

```powershell
git add docs/resumo.md
git commit -m "docs: registrar canais e PDF de orcamentos"
```

## Revisão do plano

- **Cobertura:** regras de R$ 2.000,00, WhatsApp, e-mail, assinatura, interface comercial, central WhatsApp, PDF, textos em português, paginação, testes e resumo estão associados às Tasks 1–5.
- **Consistência:** todos os botões usam `enviar-whatsapp`, `enviar-email` ou `assinafy`; nenhuma tela usa o endpoint legado `/enviar`.
- **Escopo:** não há mudança de Prisma, mobile, APK, PMOC ou conversão para O.S.
