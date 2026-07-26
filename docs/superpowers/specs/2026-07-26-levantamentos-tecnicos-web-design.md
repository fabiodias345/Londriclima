# Levantamentos técnicos antes do orçamento — Design

## Objetivo

Impedir que atendimentos de manutenção corretiva recebam orçamento sem diagnóstico. O atendimento deve criar e agendar um levantamento técnico; somente depois do registro do diagnóstico será possível montar um orçamento.

## Escopo e fases

### Fase L1 — Painel web e backend

- Identificar no atendimento WhatsApp que o caso é manutenção/corretiva.
- Criar um levantamento vinculado à conversa e ao cliente, sem preço e sem O.S. de execução.
- Exibir uma aba operacional `Levantamentos` no painel web.
- Exibir a agenda de equipes e técnicos durante o atendimento, com dias e horários livres/ocupados.
- Permitir que a atendente escolha equipe e/ou técnico, data e horário, e confirme a visita.
- Permitir registrar diagnóstico, itens necessários, observações e fotos depois da visita.
- Exibir uma aba comercial de orçamento a partir do diagnóstico, para a atendente revisar o que o técnico encontrou e montar a proposta.
- Permitir encerrar o levantamento como visita resolutiva quando o técnico corrigir um erro simples no local, cobrando apenas a visita técnica.

### Fase L2 — App técnico

- Adicionar o card `Orçamentos` entre `Minhas manutenções` e `Abastecimento` no dashboard.
- Exibir os levantamentos/orçamentos atribuídos ao técnico.
- Permitir que o técnico registre diagnóstico, serviços, peças, observações e fotos do levantamento.

A Fase L2 não será implementada neste ciclo.

## Fluxo operacional

1. O cliente descreve um defeito, por exemplo: “o ar parou de gelar”.
2. O Bolt classifica como manutenção/corretiva e coleta os dados de atendimento existentes.
3. A conversa é transferida para atendimento humano com indicação de que é necessário levantamento técnico.
4. A atendente abre o bloco `Levantamento técnico` na conversa, escolhe equipe e/ou técnico e consulta a agenda.
5. A agenda mostra horários ocupados e livres; a atendente confirma apenas um horário disponível.
6. Antes de confirmar, o atendimento preenche automaticamente a mensagem de levantamento para o cliente. A atendente pode revisar e ajustar o texto.
7. Ao confirmar, o sistema cria o levantamento agendado e envia a mensagem pelo WhatsApp.
8. Após a visita, o técnico ou a equipe registra o diagnóstico e informa se o problema foi resolvido no local.
9. Se houve resolução no local, a atendente revisa o relato e encerra como `visita técnica resolutiva`, cobrando somente a visita.
10. Se houver reparo, peça ou serviço a aprovar, o levantamento abre uma aba de orçamento. A atendente vê o diagnóstico, itens recomendados, fotos e observações do técnico e monta o orçamento com base nesses dados.
11. Antes do diagnóstico concluído, a aba de orçamento fica indisponível.

Instalação e serviços padronizados continuam podendo usar o fluxo comercial direto. A regra de levantamento obrigatório se aplica a manutenção/corretiva.

## Modelo e estados

O levantamento terá vínculo obrigatório com empresa, cliente e conversa quando a origem for WhatsApp. Ele usará estados claros:

- `pendente_agendamento`: aguardando escolha de agenda;
- `agendado`: visita confirmada com equipe/técnico e data/hora;
- `em_levantamento`: técnico iniciou a visita;
- `diagnostico_concluido`: diagnóstico registrado e pronto para orçamento;
- `resolvido_na_visita`: erro simples corrigido no local, pronto para cobrança da visita técnica;
- `cancelado`: visita cancelada sem orçamento.

O levantamento não cria O.S. de execução. A visita de diagnóstico pode usar a agenda operacional, mas sua origem e seu tipo devem ser preservados para distingui-la da O.S. resultante.

## Painel web

### Central WhatsApp

Para conversa de manutenção, a área operacional exibe um bloco `Levantamento técnico` antes de orçamento. Esse bloco possui:

- resumo do problema informado pelo cliente;
- equipe e técnico selecionáveis;
- calendário e horários livres/ocupados da agenda real;
- mensagem automática de levantamento, editável pela atendente antes do envio;
- confirmação de agendamento;
- estado do levantamento e diagnóstico quando existir;
- botão `Criar orçamento` disponível somente após `diagnostico_concluido`.

### Aba Levantamentos

A nova aba fica na operação web, próxima a WhatsApp e Orçamentos. Ela mostra filtros por estado, data, equipe e técnico; lista problema, cliente, agendamento e responsável; e abre o detalhe com diagnóstico e ação de criar orçamento quando liberada.

### Aba Orçamento do levantamento

O detalhe do levantamento com `diagnostico_concluido` abre uma aba de orçamento para a atendente, não para o técnico. A aba mostra o problema original, diagnóstico, causa provável, recomendações, peças, fotos e observações registradas em campo. A atendente usa esses dados como contexto no montador comercial existente e continua responsável por preços, desconto, validade, envio e assinatura.

Quando o estado for `resolvido_na_visita`, essa aba não cria proposta de reparo. Ela exibe a ação `Cobrar visita técnica`, com valor de visita informado pela atendente, mantendo o diagnóstico e a evidência do serviço executado no histórico.

## Agenda e conflitos

O sistema usa as mesmas regras de indisponibilidade da agenda/O.S. atual. Não deve permitir agendar um levantamento para equipe ou técnico ocupado no horário. Alterações e cancelamentos atualizam a disponibilidade exibida no atendimento.

## Mensagem automática ao cliente

Ao criar um levantamento de manutenção, o painel prepara esta mensagem antes do envio:

> Para identificar certinho o problema, vamos agendar uma visita técnica. Se for algo simples e puder ser resolvido no local, será cobrada apenas a visita técnica. Caso precise de peças ou reparo adicional, nossa equipe prepara um orçamento para sua aprovação antes de executar.

A atendente pode ajustar o texto antes de confirmar. A mensagem só é enviada depois que uma equipe ou técnico e um horário disponível forem selecionados e o levantamento for salvo.

## Diagnóstico e orçamento

O diagnóstico registra descrição técnica, causa provável, serviços recomendados, peças necessárias, observações, fotos e o resultado da visita (`precisa_orcamento` ou `resolvido_na_visita`). A criação de orçamento reutiliza cliente e dados do levantamento, mas exige `diagnostico_concluido`; não calcula preço automático e mantém o montador comercial atual para valores e itens.

Para `resolvido_na_visita`, o fluxo gera somente a cobrança de visita técnica, sem orçamento de reparo. A atendente confirma o valor antes do envio ao cliente.

## Erros e segurança

- Todas as consultas e alterações são isoladas por empresa e protegidas por administrador no painel web.
- Agendamento concorrente retorna conflito legível e recarrega a disponibilidade.
- Falha de confirmação WhatsApp não apaga o agendamento já salvo; o painel informa que a mensagem precisa ser reenviada.
- Nenhum orçamento é criado automaticamente por mensagem do cliente ou por diagnóstico incompleto.
- Somente a atendente/admin pode montar proposta, definir preço ou cobrar a visita; o técnico apenas informa o resultado do campo.

## Validação da Fase L1

- Testes backend para criação, estados, isolamento por empresa, conflito de agenda e bloqueio de orçamento sem diagnóstico.
- Testes frontend para a aba, calendário no atendimento e disponibilidade condicional do botão de orçamento.
- Validação manual no painel web: abrir manutenção, escolher equipe/técnico, visualizar horário ocupado/livre, agendar visita, registrar diagnóstico e abrir a aba de orçamento para a atendente.
- Validar o desfecho resolvido em visita: registrar solução simples, informar valor de visita, confirmar cobrança e garantir que não seja criado orçamento de reparo.
- Build backend, suíte backend, testes frontend e `git diff --check` aprovados.

## Critério de conclusão

No painel web, uma manutenção recebida pelo WhatsApp vira levantamento técnico agendado com disponibilidade real de agenda. Após o diagnóstico, a atendente abre uma aba comercial com os achados de campo para montar o orçamento; se o técnico resolver no local, a atendente cobra apenas a visita técnica. O app técnico fica explicitamente como próxima fase.
