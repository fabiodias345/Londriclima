# Resumo AIRMOVEBR

Atualizado em: 30/06/2026

Este arquivo deve registrar somente o que falta fazer ou validar. Historico implementado fica no Git e nos testes.

## Proximo foco

1. Validar no APK os checklists simplificados mensal, trimestral, semestral e anual em uso real de campo.
2. Melhorar finalizacao da O.S. no app depois da validacao dos tecnicos.
3. Adaptar posteriormente o relatorio tecnico e o PDF PMOC aos novos codigos de checklist.

## App tecnico - pendencias futuras

- Checklists agora sao independentes por periodicidade e precisam de validacao visual no aparelho.
- Confirmar em campo o fluxo anual por etapas, com escolha entre evaporadoras ou condensadoras primeiro.
- Confirmar restauracao de respostas, fotos por maquina e sincronizacao offline em rede instavel.
- Melhorar a finalizacao da O.S.:
  - resumo antes da assinatura;
  - area de assinatura maior;
  - botao fixo de finalizar;
  - mensagens claras para nome, assinatura, checklist ou sync faltando.
- APK funcional em aparelho fisico; falta aprovacao dos tecnicos.
- Gerar APK novo depois da validacao visual.
- Publicar as alteracoes quando o fluxo estiver aprovado pelos tecnicos.

## Painel admin - pendencias futuras

- Recorrencia em producao validada: scheduler da Locaweb gerou O.S. automatica para Luri/Paulo em 30/06/2026 e o APK recebeu apos atualizar.
- Falta validar no painel a correcao operacional de O.S. gerada errada:
  - editar;
  - cancelar/apagar;
  - revisar historico.

## PMOC futuro

- PMOC ajustado para mostrar periodicidade executada no relatorio, sem colunas ambíguas de X.
- Conferir PDF PMOC real depois do deploy e ajustar se necessario.
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
