# Agenda: destaque visual de dia agendado

## Objetivo

Marcar visualmente, no calendário mensal do Admin web, cada dia que possui pelo menos um item agendado.

## Escopo

- Alterar somente a renderização e o CSS da agenda em `apps/admin`.
- Usar verde suave como destaque de dia com agenda.
- Preservar o destaque visual do dia atual.
- Não alterar API, banco, agenda de O.S., levantamentos, Flutter ou mobile.

## Comportamento

Ao renderizar o mês, o painel calcula as datas dos itens que possuem `agendada_para`. A célula correspondente recebe uma classe visual `has-scheduled`. Dias sem agendamento permanecem no estilo atual.

## Visual

A classe `has-scheduled` usará fundo verde suave e borda/acento verde discreto. Os textos dos itens usarão preto `#111827` para manter contraste. O conteúdo, clique, seleção e indicador de dia atual continuam funcionando. Quando houver sobreposição entre dia atual e dia agendado, ambos os estados devem permanecer legíveis.

## Validação

- Teste frontend deve confirmar que a agenda contém a regra/classe de destaque.
- `npm.cmd run frontend:test`.
- `git diff --check`.
- Nenhum arquivo em `apps/mobile` ou `apps/admin_mobile` será alterado.
