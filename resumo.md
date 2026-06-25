# Resumo AIRMOVEBR

Atualizado em: 25/06/2026

Este arquivo deve registrar somente o que falta fazer ou validar. Historico implementado fica no Git e nos testes.

## Proximo foco

1. Alinhar o backend do checklist com `checklist.md` sempre que a especificacao mudar.
2. Validar no celular real o fluxo completo da preventiva:
   - selecionar O.S.;
   - selecionar/cadastrar maquina;
   - preencher checklist mensal;
   - registrar fotos exigidas;
   - salvar checklist;
   - finalizar com nome, assinatura e GPS.
3. Ajustar o que aparecer ruim no uso em campo, principalmente sob sol.

## App tecnico - pendencias futuras

- Revisar a regra final de fotos por periodicidade:
  - mensal;
  - trimestral;
  - semestral com foto da condensadora limpa;
  - anual com foto da condensadora limpa.
- Melhorar a finalizacao da O.S.:
  - resumo antes da assinatura;
  - area de assinatura maior;
  - botao fixo de finalizar;
  - mensagens claras para nome, assinatura, checklist ou sync faltando.
- Testar o APK em aparelho fisico com API local.
- Gerar APK novo depois da validacao visual.
- Publicar as alteracoes quando o fluxo estiver aprovado no celular.

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

- Refazer o PDF avulso/corretivo com layout visual profissional usando dados reais:
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
