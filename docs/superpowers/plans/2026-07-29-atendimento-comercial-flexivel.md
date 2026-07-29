# Atendimento Comercial Flexível Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o bot sequencial de cadastro em um atendimento comercial guiado pelo serviço solicitado, mantendo nome, CEP e e-mail como dados importantes, mas permitindo que o cliente recuse qualquer um deles sem bloquear a conversa.

**Architecture:** Manter o atendimento determinístico, sem IA generativa. O estado JSON da conversa ganhará memória comercial e status por campo; o `BoltRules` identificará o serviço, extrairá informações espontâneas e escolherá uma única próxima pergunta útil. CPF/CNPJ permanecerão fora do bot e serão solicitados somente pelo atendente.

**Tech Stack:** NestJS, TypeScript, Prisma JSON (`WhatsAppConversa.dados`), Node test runner.

---

### Task 1: Modelar memória comercial e compatibilidade do estado

**Files:**
- Modify: `apps/backend/src/modules/whatsapp/bolt/bolt.types.ts`
- Modify: `apps/backend/src/modules/whatsapp/bolt/bolt.rules.ts`
- Test: `apps/backend/src/modules/whatsapp/whatsapp.service.spec.ts`

- [ ] **Step 1: Definir os serviços suportados e status dos campos**

Adicionar categorias explícitas para instalação, desinstalação, corretiva, preventiva, limpeza de filtro, aluguel, PMOC e venda, além de `nao_identificado`. Adicionar status `nao_informado`, `informado`, `recusado` e `invalido` para nome, CEP e e-mail.

- [ ] **Step 2: Expandir `BoltData` sem quebrar conversas existentes**

Adicionar uma memória comercial dentro de `BoltData`, incluindo equipamento, BTUs, posse do aparelho, infraestrutura, fotos, urgência, cidade/bairro, objeções e próximo passo. `normalizarDadosBolt` deve preencher os novos campos ausentes com valores padrão para estados antigos.

- [ ] **Step 3: Definir regras de cadastro**

Implementar estas regras no normalizador/engine:

```ts
// nome, CEP e e-mail são úteis, mas nunca bloqueiam a conversa
// CPF/CNPJ não pertence ao estado do bot
if (campo.status === "recusado") nuncaPerguntarNovamente(campo);
if (campo.status === "invalido") pedirUmaNovaTentativa(campo);
```

- [ ] **Step 4: Criar testes de compatibilidade do estado**

Cobrir estado antigo sem memória, estado com e-mail recusado e preservação de dados já informados. Não exigir migração Prisma, pois os dados já são armazenados em JSON.

### Task 2: Substituir o fluxo linear por roteamento comercial

**Files:**
- Modify: `apps/backend/src/modules/whatsapp/bolt/bolt.rules.ts`
- Modify: `apps/backend/src/modules/whatsapp/bolt/bolt.types.ts`
- Test: `apps/backend/src/modules/whatsapp/whatsapp.service.spec.ts`

- [ ] **Step 1: Extrair dados espontâneos antes de perguntar**

Reconhecer, quando presentes na mensagem, serviço, BTUs, posse do aparelho, defeito, urgência, infraestrutura, cidade/bairro e recusa de nome/CEP/e-mail. A mensagem do cliente deve atualizar a memória mesmo quando a informação não era a pergunta atual.

- [ ] **Step 2: Identificar o serviço sem reiniciar a conversa**

Mapear termos para os serviços:

```ts
instalar / instalação       -> instalacao
desinstalar / retirar       -> desinstalacao
parou / não gela / defeito  -> manutencao_corretiva
revisão / preventiva        -> manutencao_preventiva
limpar filtro               -> limpeza_filtro
alugar / locação            -> aluguel
pmoc                        -> pmoc
comprar / vender aparelho   -> venda_equipamento
```

Se o serviço já estiver identificado, nunca voltar para o menu nem perguntar novamente qual serviço é.

- [ ] **Step 3: Criar um fluxo por serviço**

Implementar funções privadas ou módulos pequenos com a seguinte ordem de descoberta:

| Serviço | Próximos dados prioritários |
|---|---|
| Instalação | possui aparelho, BTUs/modelo, infraestrutura, fotos, cidade/bairro |
| Desinstalação | equipamento, local, acesso, transporte |
| Corretiva | defeito, equipamento, urgência, fotos/vídeo |
| Preventiva | quantidade, equipamento, última manutenção, localização |
| Limpeza de filtro | quantidade, modelo, periodicidade, localização |
| Aluguel | período, equipamento, BTUs, local |
| PMOC | empresa, quantidade de aparelhos, endereço comercial, escopo |
| Venda | ambiente, capacidade desejada, equipamento, instalação |

Cada resposta deve conter no máximo uma pergunta principal. Endereço completo e número só devem ser solicitados quando houver visita/agendamento; CPF/CNPJ nunca deve ser solicitado pelo bot.

- [ ] **Step 4: Responder objeções antes de conduzir o fluxo**

Para recusa de e-mail, responder e avançar:

```text
Tranquilo, podemos continuar pelo WhatsApp. Você já tem o aparelho ou ainda está escolhendo?
```

Para foto ou dado desconhecido, oferecer alternativa: foto em outro momento, avaliação preliminar ou visita.

- [ ] **Step 5: Testar os casos comerciais principais**

Adicionar cenários para instalação, aluguel, PMOC, desinstalação, limpeza, preventiva e corretiva; validar que uma informação já fornecida não é perguntada novamente e que a recusa de e-mail não produz “e-mail inválido”.

### Task 3: Ajustar coleta de nome, CEP e e-mail

**Files:**
- Modify: `apps/backend/src/modules/whatsapp/bolt/bolt.rules.ts`
- Modify: `apps/backend/src/modules/whatsapp/whatsapp.service.ts`
- Test: `apps/backend/src/modules/whatsapp/whatsapp.service.spec.ts`

- [ ] **Step 1: Tornar o nome opcional**

Perguntar o nome no primeiro contato, mas aceitar recusa e usar o nome do perfil ou “cliente”. O fluxo deve continuar para identificação do serviço.

- [ ] **Step 2: Tornar o CEP contextual**

Solicitar CEP quando a localização for útil para deslocamento, orçamento ou visita. Se recusado, registrar `cep.status = "recusado"` e continuar pedindo cidade/bairro ou outro dado comercial relevante.

- [ ] **Step 3: Tornar o e-mail opcional**

Aceitar respostas como “não quero”, “não tenho” e “pode ser só pelo WhatsApp” como recusa. Não gravar valores fictícios como `cliente@exemplo.com`; manter o valor vazio e o status `recusado`. Nunca repetir a pergunta na mesma conversa.

- [ ] **Step 4: Manter a consulta de CEP somente quando houver CEP válido**

Preservar `responderComCep`, mas fazê-lo atuar somente quando a etapa comercial estiver aguardando localização/CEP. Uma resposta recusando o CEP não deve ser interpretada como CEP inválido.

- [ ] **Step 5: Cobrir validações**

Adicionar testes para nome recusado, CEP recusado, e-mail recusado, e-mail inválido com nova tentativa e e-mail não informado ao criar cliente. CPF/CNPJ deve permanecer ausente do DTO automático.

### Task 4: Revisar handoff para o atendente e a prévia comercial

**Files:**
- Modify: `apps/backend/src/modules/whatsapp/whatsapp.service.ts`
- Modify: `apps/backend/src/modules/whatsapp/bolt/bolt.rules.ts`
- Test: `apps/backend/src/modules/whatsapp/whatsapp.service.spec.ts`

- [ ] **Step 1: Enviar ao atendente a memória comercial completa**

Garantir que a conversa transferida preserve serviço, detalhes, equipamento, BTUs, urgência, objeções, campos recusados e próximo passo para evitar que o atendente repita perguntas.

- [ ] **Step 2: Ajustar a prévia da O.S.**

Usar o serviço específico e os campos disponíveis na memória; não exigir e-mail, CPF/CNPJ ou endereço completo para gerar a prévia inicial.

- [ ] **Step 3: Separar negociação de cadastro formal**

Manter CPF/CNPJ fora do `BoltRules`. O atendente poderá pedir esses dados na interface humana quando precisar emitir nota, formalizar contrato ou concluir cadastro.

- [ ] **Step 4: Validar o fluxo de ponta a ponta**

Verificar manualmente os cenários: cliente recusa e-mail, cliente já informa instalação e BTUs na primeira mensagem, cliente muda de serviço, cliente não consegue enviar foto e cliente solicita atendimento humano.

### Task 5: Limpar respostas e documentar a política do bot

**Files:**
- Modify: `apps/backend/src/modules/whatsapp/bolt/bolt.rules.ts`
- Create: `docs/atendimento-comercial-whatsapp.md`

- [ ] **Step 1: Corrigir mensagens robóticas e comandos internos expostos**

Trocar frases vazias por confirmações específicas e nunca exibir IDs internos como `cep_confirmar`; aceitar o ID internamente, mas mostrar linguagem natural ao cliente.

- [ ] **Step 2: Documentar a política de coleta**

Registrar que nome, CEP e e-mail são importantes porém opcionais; endereço completo é contextual; CPF/CNPJ é exclusivo do atendente; o bot faz uma pergunta principal por mensagem.

- [ ] **Step 3: Fazer revisão final do plano implementado**

Conferir que cada serviço tenha uma próxima pergunta definida, nenhuma recusa seja perguntada novamente, informações espontâneas sejam preservadas e o atendimento nunca seja reiniciado por falta de cadastro.

## Ordem de implementação

1. Modelar estado compatível.
2. Implementar identificação de serviço e memória.
3. Implementar fluxos específicos.
4. Ajustar coleta opcional de nome/CEP/e-mail.
5. Revisar transferência ao atendente e documentação.

Não adicionar IA generativa nesta etapa. Primeiro estabilizar o fluxo determinístico; uma IA poderá ser adicionada depois apenas para interpretar mensagens, mantendo regras fixas para dados, preços, recusas e ações operacionais.
