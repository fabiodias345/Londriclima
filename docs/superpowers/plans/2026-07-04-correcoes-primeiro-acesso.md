# Correcoes do Primeiro Acesso Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar a tela vermelha ao abrir o primeiro cadastro, orientar corretamente CPF e telefone e corrigir o portugues do termo no aplicativo e no PDF.

**Architecture:** O dialogo Flutter deixa de depender de um controlador descartado durante a animacao. Os campos numericos usam formatadores locais reutilizaveis, enquanto a API continua recebendo somente digitos. O gerador PDF preserva caracteres WinAnsi e publica uma nova versao do termo.

**Tech Stack:** Flutter/Dart, NestJS/TypeScript, PDF 1.4 com Helvetica WinAnsi, Flutter Test e Node Test.

---

## Extensao aprovada em 2026-07-04

- [ ] Ajustar o convite para escolher e persistir a funcao `tecnico` ou `auxiliar` no admin e no backend.

### Task 1: Corrigir abertura do primeiro cadastro

**Files:**
- Modify: `apps/mobile/lib/src/screens/login_screen.dart`
- Test: `apps/mobile/test/widget_test.dart`

- [ ] **Step 1: Escrever teste do fluxo de convite**

Adicionar gateway que retorna `true` em `validateTechnicianInvite`, tocar em `firstRegistrationButton`, informar `ABCD-EFGH`, tocar em `validateTechnicianInviteButton` e confirmar `firstAccessNameField` sem excecao Flutter.

- [ ] **Step 2: Executar o teste e confirmar a falha atual**

```powershell
flutter test test/widget_test.dart --plain-name "primeiro cadastro abre sem excecao"
```

Expected: FAIL com erro relacionado ao `TextEditingController` descartado durante o fechamento do dialogo.

- [ ] **Step 3: Remover o controlador do dialogo**

Substituir o `TextEditingController` por uma variavel local `String code = ''` atualizada pelo `onChanged` do `TextField`, retornando `code.trim()` ao pressionar **Continuar**.

- [ ] **Step 4: Executar novamente o teste**

```powershell
flutter test test/widget_test.dart --plain-name "primeiro cadastro abre sem excecao"
```

Expected: PASS.

### Task 2: Formatar e validar CPF e telefone

**Files:**
- Modify: `apps/mobile/lib/src/screens/first_access_screen.dart`
- Test: `apps/mobile/test/widget_test.dart`

- [ ] **Step 1: Escrever testes dos campos**

Cobrir CPF limitado e exibido como `730.704.599-00`, telefone exibido como `(43) 98445-1266` e mensagens especificas para CPF e telefone incompletos.

- [ ] **Step 2: Implementar formatador numerico brasileiro**

Criar `_DigitsMaskFormatter` baseado em `TextInputFormatter`, com limite de digitos e mascaras `###.###.###-##`, `(##) ####-####` e `(##) #####-####`.

- [ ] **Step 3: Aplicar os formatadores**

Usar `FilteringTextInputFormatter.digitsOnly` e `_DigitsMaskFormatter` nos dois campos. Manter `_digits(...)` antes do envio à API.

- [ ] **Step 4: Separar mensagens de validacao**

Validar nome, CPF e telefone em blocos independentes com mensagens `Informe o nome completo.`, `Informe um CPF com 11 digitos.` e `Informe um telefone com DDD.`.

- [ ] **Step 5: Executar testes Flutter**

```powershell
flutter test
flutter analyze --no-pub
```

Expected: PASS sem erros de analise.

### Task 3: Corrigir portugues do termo

**Files:**
- Modify: `apps/mobile/lib/src/screens/first_access_screen.dart`
- Modify: `apps/backend/src/modules/auth/funcionario-termo.service.ts`
- Modify: `apps/backend/src/modules/auth/funcionario-termo.service.spec.ts`

- [ ] **Step 1: Escrever teste de acentuacao do PDF**

Verificar no buffer Latin-1 as palavras `proteção`, `identificação`, `não`, `relatórios` e `serviços`, alem da versao `2026-07-04`.

- [ ] **Step 2: Atualizar o texto no aplicativo**

Corrigir `é pessoal`, `não compartilhar`, `relatórios`, `serviços`, `técnico`, `funcionário` e demais textos visiveis do primeiro cadastro.

- [ ] **Step 3: Preservar WinAnsi no PDF**

Alterar `escape` para remover apenas caracteres fora de `\x20-\xFF`, mantendo o escape de barra e parenteses, e revisar todas as clausulas com portugues correto.

- [ ] **Step 4: Atualizar a versao do termo**

Alterar `TERMO_RESPONSABILIDADE_VERSAO` para `2026-07-04`.

- [ ] **Step 5: Executar validacao final**

```powershell
npm run backend:test
npm run backend:build
git diff --check
```

Expected: todos os comandos concluem sem falhas.
