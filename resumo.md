# Resumo AIRMOVEBR

Atualizado em: 25/06/2026

Este arquivo deve registrar somente o que falta fazer ou validar. Historico implementado fica no Git e nos testes.

## Proximo foco

1. Validar no APK o novo checklist preventivo em uso real de campo.
2. Baixar e conferir PDF avulso real gerado com respostas e fotos do app.
3. Alinhar o backend do checklist com `checklist.md` sempre que a especificacao mudar.

## App tecnico - pendencias futuras

- Checklist preventivo ajustado no backend:
  - sem opcao N/A;
  - mensal com foto inicial;
  - trimestral com foto inicial e foto da evaporadora limpa depois de ruido/fluxo de ar;
  - semestral/anual com foto inicial, foto da evaporadora limpa e foto da condensadora limpa;
  - foto da condensadora limpa abaixo de religado e verificado;
  - ligar disjuntor fica no final dos checklists acumulados, acima de religado e verificado quando existir.
- Melhorar a finalizacao da O.S.:
  - resumo antes da assinatura;
  - area de assinatura maior;
  - botao fixo de finalizar;
  - mensagens claras para nome, assinatura, checklist ou sync faltando.
- APK funcional em aparelho fisico; falta aprovacao dos tecnicos.
- Gerar APK novo depois da validacao visual.
- Publicar as alteracoes quando o fluxo estiver aprovado pelos tecnicos.

## Painel admin - pendencias futuras

- Confirmar se planos preventivos permitem editar e apagar em producao.
- Confirmar se O.S. gerada errada pode ser apagada/cancelada pelo painel.
- Validar o fluxo:
  - criar preventiva;
  - gerar O.S.;
  - enviar para campo;
  - acompanhar execucao;
  - concluir e revisar historico.

## Relatorios futuros

- PDF avulso/corretivo ja deve usar respostas reais do app e fotos do checklist preventivo.
- Conferir no PDF real a ordem atual:
  - foto da evaporadora limpa depois de ruido/fluxo de ar;
  - foto da condensadora limpa depois de religado e verificado;
  - ligar disjuntor acima de religado e verificado em semestral/anual.
- Continuar refinando layout visual profissional usando dados reais:
  - cliente;
  - endereco;
  - O.S.;
  - maquina;
  - tecnico;
  - datas;
  - servico realizado;
  - evidencias reais;
  - GPS;
  - assinatura.
- Validar PDF real baixado antes de publicar.
- Depois do avulso aprovado, aplicar o padrao visual ao PMOC.

## PMOC futuro

- Manter PMOC separado por cliente/endereco.
- Uma pagina por maquina.
- Nao misturar O.S., fotos ou equipamentos entre clientes.
- Adicionar dados faltantes de maquina quando necessario:
  - area climatizada;
  - ocupantes fixos;
  - ocupantes variaveis.

## Deploy e validacao

- Antes de publicar:
  - `flutter analyze`
  - testes Flutter afetados;
  - `npm.cmd run backend:build` se backend mudar;
  - teste manual no celular;
  - health da API.
- Producao atual:
  - VM: `191.252.226.11`
  - repo: `/opt/airmovebr/repo`
