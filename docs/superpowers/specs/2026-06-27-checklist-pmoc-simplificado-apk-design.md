# Checklist PMOC simplificado no APK

Data: 27/06/2026

## Escopo

Alterar o fluxo de checklist do aplicativo Flutter e o contrato da API mobile que fornece e recebe os itens. O painel administrativo, o relatório técnico e o PDF PMOC não fazem parte desta entrega.

Os checklists são independentes por periodicidade. Trimestral, semestral e anual não acumulam itens dos períodos anteriores.

Cada máquina mantém separadamente suas respostas, medições, observações, fotos e progresso. A OS somente pode ser finalizada quando todas as máquinas estiverem concluídas.

## Tipos de resposta

- Testes e inspeções: `Normal`, `Irregularidade encontrada` e `Não testado`.
- Medições: valor numérico obrigatório em graus Celsius.
- Fotos: captura obrigatória vinculada à máquina e ao item.
- Observação: obrigatória para `Não conforme`, `Não executado`, `Irregularidade encontrada` e `Não testado`; opcional nos demais casos.

Não será usada resposta genérica `Sim/Não`.

## Manutenção mensal

1. Limpeza ou substituição dos filtros.
2. Teste do controle remoto/comandos.
3. Teste do dreno.
4. Inspeção visual: ruídos, vibrações, vazamentos e danos aparentes.
5. Medição da temperatura de insuflamento em °C.
6. Medição da temperatura de retorno/exaustão em °C.
7. Foto do insuflamento mostrando a medição.
8. Foto da máquina aberta com o filtro limpo.

## Manutenção trimestral

1. Limpeza ou substituição dos filtros.
2. Teste do controle remoto/comandos.
3. Teste do dreno.
4. Inspeção visual: ruídos, vibrações, vazamentos e danos aparentes.
5. Limpeza superficial da serpentina da evaporadora.
6. Revisão das conexões elétricas.
7. Revisão dos motores e ventiladores.
8. Verificação do isolamento térmico das tubulações.
9. Inspeção visual do circuito frigorífico para indícios de vazamentos.
10. Medição da temperatura de insuflamento em °C.
11. Medição da temperatura de retorno/exaustão em °C.
12. Foto do insuflamento mostrando a medição.
13. Foto da máquina aberta com o filtro limpo.

## Manutenção semestral

1. Teste do controle remoto/comandos.
2. Higienização completa da evaporadora.
3. Foto da máquina aberta e desmontada com bolsão embaixo.
4. Revisão dos motores e ventiladores.
5. Verificação das fixações: suportes, coxins e parafusos.
6. Medição da temperatura de insuflamento em °C.
7. Foto do insuflamento mostrando a medição.

## Manutenção anual

1. Teste do controle remoto/comandos.
2. Higienização completa da evaporadora.
3. Foto da máquina aberta e desmontada com bolsão embaixo.
4. Higienização completa da condensadora.
5. Foto da condensadora limpa.
6. Verificação completa do circuito frigorífico: pressões, estanqueidade e carga quando necessário.
7. Inspeção completa dos componentes elétricos.
8. Verificação do isolamento térmico das tubulações.
9. Medição da temperatura de insuflamento em °C.
10. Medição da temperatura de retorno/exaustão em °C.
11. Foto do insuflamento mostrando a medição.

## Fluxo do aplicativo

1. O técnico abre a OS e visualiza as máquinas e o progresso individual.
2. Nas manutenções mensal, trimestral e semestral, seleciona uma máquina e preenche somente o checklist da periodicidade definida na OS.
3. Na manutenção anual, o aplicativo oferece `Evaporadoras primeiro` como padrão e permite escolher `Condensadoras primeiro` quando o ambiente estiver ocupado.
4. A etapa anual selecionada mostra todas as máquinas. O técnico pode executar primeiro aquela etapa em todas elas e depois trocar para a outra etapa.
5. O técnico pode salvar parcialmente e alternar entre máquinas ou etapas sem perder respostas.
6. O modo offline mantém respostas, observações, medições e fotos na fila de sincronização.
7. A máquina muda para concluída somente após todos os itens e fotos obrigatórios serem salvos.
8. A finalização da OS permanece bloqueada enquanto existir máquina pendente ou sincronização obrigatória não concluída.

## API mobile e persistência

O backend continua sendo a fonte dos itens do checklist. A API deve retornar cada item com código estável, texto, tipo, opções, unidade e obrigatoriedade. O APK não deve manter uma segunda cópia divergente dos checklists de produção.

O salvamento continua vinculado a `osId`, `equipamentoId`, `checklistTipo` e código do item. Salvamentos parciais devem atualizar somente os itens enviados, preservando respostas já registradas em outras etapas da mesma máquina.

Fotos permanecem armazenadas como evidências de checklist vinculadas ao código do item e à máquina. A fila offline deve preservar o mesmo vínculo durante a sincronização.

## Validações e erros

- Destacar e posicionar a tela no primeiro item obrigatório ausente.
- Exigir observação quando a resposta indicar falha, irregularidade ou não execução.
- Rejeitar temperatura vazia ou não numérica.
- Exigir todas as fotos previstas para a periodicidade.
- Mostrar erro de envio de foto sem apagar as demais respostas.
- Permitir nova tentativa de sincronização sem duplicar respostas ou fotos.

## Verificação

- Testes unitários do backend para a composição independente das quatro periodicidades.
- Testes do repositório Flutter para serialização, salvamento parcial e fila offline.
- Testes de widget para opções de resposta, observação condicional, temperaturas, fotos e bloqueio de finalização.
- Validação manual no APK com OS mensal, trimestral, semestral e anual, incluindo múltiplas máquinas e troca da ordem anual.
