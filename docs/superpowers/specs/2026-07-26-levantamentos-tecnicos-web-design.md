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
- Liberar a criação do orçamento somente para levantamento com diagnóstico concluído.

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
6. O sistema cria o levantamento agendado e envia a confirmação ao cliente pelo fluxo de WhatsApp já existente.
7. Após a visita, o técnico ou a equipe registra o diagnóstico.
8. Com o levantamento concluído, a atendente cria o orçamento a partir do diagnóstico; antes disso, o botão de orçamento fica indisponível.

Instalação e serviços padronizados continuam podendo usar o fluxo comercial direto. A regra de levantamento obrigatório se aplica a manutenção/corretiva.

## Modelo e estados

O levantamento terá vínculo obrigatório com empresa, cliente e conversa quando a origem for WhatsApp. Ele usará estados claros:

- `pendente_agendamento`: aguardando escolha de agenda;
- `agendado`: visita confirmada com equipe/técnico e data/hora;
- `em_levantamento`: técnico iniciou a visita;
- `diagnostico_concluido`: diagnóstico registrado e pronto para orçamento;
- `cancelado`: visita cancelada sem orçamento.

O levantamento não cria O.S. de execução. A visita de diagnóstico pode usar a agenda operacional, mas sua origem e seu tipo devem ser preservados para distingui-la da O.S. resultante.

## Painel web

### Central WhatsApp

Para conversa de manutenção, a área operacional exibe um bloco `Levantamento técnico` antes de orçamento. Esse bloco possui:

- resumo do problema informado pelo cliente;
- equipe e técnico selecionáveis;
- calendário e horários livres/ocupados da agenda real;
- confirmação de agendamento;
- estado do levantamento e diagnóstico quando existir;
- botão `Criar orçamento` disponível somente após `diagnostico_concluido`.

### Aba Levantamentos

A nova aba fica na operação web, próxima a WhatsApp e Orçamentos. Ela mostra filtros por estado, data, equipe e técnico; lista problema, cliente, agendamento e responsável; e abre o detalhe com diagnóstico e ação de criar orçamento quando liberada.

## Agenda e conflitos

O sistema usa as mesmas regras de indisponibilidade da agenda/O.S. atual. Não deve permitir agendar um levantamento para equipe ou técnico ocupado no horário. Alterações e cancelamentos atualizam a disponibilidade exibida no atendimento.

## Diagnóstico e orçamento

O diagnóstico registra descrição técnica, causa provável, serviços recomendados, peças necessárias, observações e fotos. A criação de orçamento reutiliza cliente e dados do levantamento, mas exige `diagnostico_concluido`; não calcula preço automático e mantém o montador comercial atual para valores e itens.

## Erros e segurança

- Todas as consultas e alterações são isoladas por empresa e protegidas por administrador no painel web.
- Agendamento concorrente retorna conflito legível e recarrega a disponibilidade.
- Falha de confirmação WhatsApp não apaga o agendamento já salvo; o painel informa que a mensagem precisa ser reenviada.
- Nenhum orçamento é criado automaticamente por mensagem do cliente ou por diagnóstico incompleto.

## Validação da Fase L1

- Testes backend para criação, estados, isolamento por empresa, conflito de agenda e bloqueio de orçamento sem diagnóstico.
- Testes frontend para a aba, calendário no atendimento e disponibilidade condicional do botão de orçamento.
- Validação manual no painel web: abrir manutenção, escolher equipe/técnico, visualizar horário ocupado/livre, agendar visita, registrar diagnóstico e liberar orçamento.
- Build backend, suíte backend, testes frontend e `git diff --check` aprovados.

## Critério de conclusão

No painel web, uma manutenção recebida pelo WhatsApp vira levantamento técnico agendado com disponibilidade real de agenda. O orçamento só fica disponível depois que o diagnóstico é concluído. O app técnico fica explicitamente como próxima fase.
