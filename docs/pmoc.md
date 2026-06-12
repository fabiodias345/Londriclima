# PMOC - Cadastro, Relatorio e Assinatura Tecnica

Este documento registra a decisao de negocio para PMOC no AIRMOVEBR Digital.
O checklist operacional detalhado fica em `checklist.md` e sera usado como base do aplicativo do tecnico.

## Regras de Negocio

- Nem todo cliente precisa de PMOC.
- O cadastro de cliente deve ter a opcao **Cliente exige PMOC**.
- Cliente PMOC deve ser vinculado a um engenheiro responsavel antes da emissao do relatorio.
- Cada cliente deve gerar relatorio proprio, separado dos demais clientes.
- Dentro do relatorio de um cliente, as maquinas devem ficar separadas maquina por maquina.
- Equipamentos sem gas refrigerante cadastrado devem obrigar preenchimento na primeira visita tecnica.
- Depois que o gas refrigerante for preenchido uma vez, ele passa a fazer parte da ficha tecnica do equipamento.

## Engenheiro Responsavel

O painel administrativo deve permitir cadastrar responsaveis tecnicos com:

- Nome.
- CPF.
- CREA.
- E-mail.
- Telefone.

O engenheiro e vinculado por empresa e pode assinar relatorios de clientes PMOC dessa empresa.

O sistema nao deve armazenar assinatura digitalizada reutilizavel do engenheiro. A assinatura do PMOC deve ser tratada como evento de aprovacao de um relatorio especifico, por link seguro ou integracao externa de assinatura digital. O historico deve guardar evidencias da assinatura do documento, como status, data, responsavel e hash/versao do relatorio, nao uma imagem fixa da assinatura.

## Fluxo Futuro do Relatorio

1. Tecnico executa as OS e checklists no aplicativo.
2. Sistema agrupa somente OS e maquinas do mesmo cliente.
3. Sistema monta um PDF PMOC por cliente, com ficha de cada maquina separada.
4. No fim do atendimento ou no ultimo dia do mes, o PDF e enviado ao engenheiro responsavel.
5. O engenheiro assina o relatorio daquele cliente.
6. O relatorio assinado fica armazenado no historico do cliente e das maquinas envolvidas.

## Limites da Primeira Implementacao

A primeira entrega prepara a base do PMOC:

- Checkbox PMOC no cadastro de cliente.
- Cadastro de engenheiro responsavel.
- Vinculo cliente PMOC -> engenheiro responsavel.
- Dados retornados pela API separados por cliente, prontos para a geracao futura de PDF.

A geracao real do PDF, envio de e-mail e assinatura remota serao implementados em etapa propria.
