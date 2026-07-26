# Fase L2 — Laudo técnico web — Design

## Objetivo

Permitir que o técnico registre o resultado de um levantamento pelo navegador usando seu login atual. O laudo somente libera cobrança de visita ou orçamento depois de finalizado, mantendo a atendente como única responsável por valores e proposta comercial.

## Escopo

Inclui backend e interface web responsiva para o técnico. Não altera Flutter, APK, app técnico, envio de orçamento, assinatura, templates Meta nem criação de O.S. de execução.

## Papéis

- Técnico/auxiliar: vê somente levantamentos atribuídos a si ou à sua equipe; cria e atualiza o próprio rascunho; envia fotos; finaliza o laudo. Não vê nem informa preços.
- Atendente/admin: vê todos os levantamentos da empresa, o laudo final e suas fotos; escolhe o valor da visita quando resolvido no local; monta orçamento quando houver reparo/peça.

## Estados e transições

```text
agendado → em_levantamento → rascunho de laudo
rascunho → diagnostico_concluido → pronto para orçamento
rascunho → resolvido_na_visita → pronto para cobrança da visita
```

- Abrir um levantamento para preenchimento move `agendado` para `em_levantamento`.
- Salvar rascunho não libera nenhuma ação comercial.
- Finalizar exige diagnóstico e uma decisão.
- Após finalizado, o técnico não sobrescreve o conteúdo; a atendente pode reabrir o laudo, registrando quem reabriu e o motivo.
- `cancelado` continua sem laudo comercial nem cobrança.

## Laudo do técnico

Campos:

- diagnóstico técnico (obrigatório ao finalizar);
- causa provável (opcional);
- serviços recomendados (opcional);
- peças/itens recomendados, somente descrição e quantidade, sem preço;
- avaliação de limpeza opcional: `não recomendada`, `recomendada` ou `urgente`, com observação e pelo menos uma foto quando recomendada;
- observações;
- fotos opcionais, com legenda;
- decisão obrigatória: `precisa_orcamento` ou `resolvido_na_visita`.

O rascunho pode ser salvo diversas vezes. Se a conexão cair, o último rascunho persistido continua disponível ao novo acesso. A finalização grava data/hora e técnico responsável.

## Interface do técnico

Uma rota web autenticada mostra uma lista compacta de “Meus levantamentos”, com cliente, endereço, horário, problema e estado. Ao abrir um item, o técnico encontra um único formulário de laudo com ações `Salvar rascunho` e `Finalizar levantamento`.

A finalização apresenta confirmação da decisão escolhida. Se for orçamento, informa que a atendente receberá os achados para elaborar a proposta. Se for resolvido na visita, informa que a atendente definirá e cobrará somente a visita técnica.

Quando houver limpeza recomendada, o técnico registra a condição encontrada e anexa foto do equipamento. O painel deixa essa recomendação destacada para a atendente, que pode apresentar o serviço adicional e seu valor ao cliente. O técnico só adiciona a limpeza ao atendimento e a executa após autorização explícita do cliente; essa autorização segue a mesma espera máxima de 20 minutos no local.

## Painel operacional e comercial

O detalhe de Levantamentos no Admin passa a mostrar laudo, fotos, responsável, estado e histórico de finalização/reabertura.

- `diagnostico_concluido`: habilita `Criar orçamento a partir do laudo`. A proposta recebe cliente, conversa, título e contexto técnico; preços e itens comerciais são preenchidos pela atendente.
- `resolvido_na_visita`: antes de executar a correção simples, o técnico registra `aguardando_autorizacao`. A atendente informa o valor da visita/serviço ao cliente pelo WhatsApp e solicita autorização. O técnico aguarda no local por até 20 minutos. Com aceite, a atendente libera a execução e o técnico finaliza como resolvido; sem resposta ou recusa, ele não executa e a atendente agenda nova visita ou encerra o atendimento. Nenhum orçamento de reparo é criado nesse caminho.
- Uma recomendação de limpeza pode ser autorizada e adicionada como serviço complementar durante a mesma visita. A atendente define o preço e obtém o aceite; o técnico não define preço nem executa a limpeza antes da liberação.

## Dados, segurança e API

O levantamento recebe campos de rascunho/finalização e relações para fotos e itens técnicos recomendados. Toda consulta é isolada por empresa. A API do técnico valida atribuição direta ou por equipe e bloqueia acesso a levantamentos de outros técnicos. Endpoints administrativos preservam a regra de papel já existente.

Fotos usam o armazenamento já empregado pelo backend, com empresa e levantamento no caminho. Arquivos inválidos ou falhas de upload não finalizam o laudo.

## Validação

- testes de autorização: técnico só acessa levantamento próprio/equipe;
- testes de rascunho, finalização, reabertura e bloqueio de alterações após finalização;
- testes de decisão: orçamento só após laudo final e cobrança de visita sem orçamento de reparo;
- testes de upload/consulta de fotos;
- build backend, testes frontend e `git diff --check`.

## Critério de conclusão

Um técnico autenticado consegue preencher e salvar rascunho do laudo, anexar fotos e finalizá-lo sem valores. A atendente vê imediatamente o resultado final e consegue seguir apenas para cobrança de visita ou montagem de orçamento, conforme a decisão técnica.
