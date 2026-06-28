# Finalizacao da OS e periodicidade anual

## Objetivo

Corrigir o retorno do aplicativo apos finalizar uma ordem de servico, eliminar o overflow da lista de maquinas e disponibilizar a periodicidade anual de ponta a ponta sem misturar checklists.

## Escopo

### Aplicativo Flutter

- Ao finalizar uma OS com sucesso, online ou aguardando sincronizacao, fechar a tela de detalhes.
- Manter aberta a area `Minhas manutencoes`, recarregar as ordens e informar o resultado ao tecnico.
- Em falha de finalizacao, permanecer na tela e mostrar o erro existente.
- Tornar o cabecalho das listas de maquinas responsivo em telas estreitas e com fonte ampliada, permitindo que titulo e contador quebrem linha sem overflow.

### Painel web

- Adicionar `Anual` a todos os seletores de periodicidade de recorrencia e checklist da OS.
- Exibir corretamente o rotulo `Anual` em agenda, eventos e demais resumos.
- Preservar o valor anual ao abrir e salvar registros existentes.

### Backend e PMOC

- Aceitar e persistir `anual` sem converter para `semestral`.
- Gerar recorrencias anuais a cada 12 meses.
- Manter quatro checklists independentes: mensal, trimestral, semestral e anual.
- O checklist anual deve conter somente itens anuais; nao deve herdar, somar ou copiar itens das outras periodicidades.
- O PDF/PMOC deve reconhecer e rotular a periodicidade anual sem trata-la como semestral.

## Fluxo

1. O tecnico finaliza a OS.
2. O repositorio retorna a OS concluida ou aguardando sincronizacao.
3. A tela de detalhes retorna a OS atualizada ao dashboard.
4. O dashboard mantem `Minhas manutencoes` visivel, recarrega a lista e mostra a confirmacao.
5. Se o repositorio falhar, a navegacao nao ocorre e o erro permanece visivel.

## Compatibilidade de dados

O banco ja possui `anual` nos enums de checklist e recorrencia. Nao sera feita conversao automatica de registros semestrais, pois nao e possivel determinar com seguranca quais eram anuais. Registros anuais existentes passam a ser preservados e podem ser atualizados pelo painel.

## Validacao

- Teste Flutter confirma retorno ao dashboard apos finalizacao online e offline.
- Teste Flutter usa largura de celular e escala de texto elevada sem overflow.
- Testes do admin confirmam a opcao e o rotulo anual.
- Testes do backend confirmam persistencia anual, intervalo de 12 meses e ausencia de conversao para semestral.
- Testes dos checklists confirmam que cada periodicidade continua independente.
- Testes do PDF confirmam o rotulo anual e a selecao exclusiva de itens anuais.

## Fora do escopo

- Converter automaticamente registros semestrais antigos em anuais.
- Redesenhar telas ou alterar os itens definidos em cada checklist.
