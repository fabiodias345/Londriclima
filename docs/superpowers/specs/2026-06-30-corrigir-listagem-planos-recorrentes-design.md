# Correção da listagem de planos recorrentes

## Problema

O backend salva o plano recorrente, mas o painel não o exibe. O commit `7d7a42b` removeu `recurrenceStatusRoot` do bundle sem restaurar `recurrenceUiRoot`, deixando indisponíveis as funções de renderização chamadas por `loadRecorrencias()`.

## Correção

- importar `recurrenceStatusRoot` em `apps/admin/js/main.js`;
- incluir `recurrenceStatusRoot` no início de `adminSources`, antes dos fragmentos concatenados;
- atualizar a versão de cache de `main.js` em `apps/admin/index.html`;
- manter `recurrenceUiRoot` fora do bundle para evitar funções duplicadas.

## Validação

- executar o teste de contrato do frontend;
- compilar o bundle concatenado com `Function(adminSources.join("\n"))`;
- confirmar que o bundle contém uma única implementação de `renderRecorrencias`;
- confirmar que salvar um plano recarrega e exibe a lista sem erro JavaScript.
