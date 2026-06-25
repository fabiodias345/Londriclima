# Checklists PMOC - AIRMOVEBR

Documento de referencia para os checklists preventivos do app tecnico.

## Regras gerais

- O tecnico nao escolhe a periodicidade no app.
- A periodicidade vem da O.S. ou do plano preventivo: `mensal`, `trimestral`, `semestral` ou `anual`.
- O backend envia o checklist flat ja expandido para o app.
- O app apenas renderiza, valida preenchimento e salva respostas.
- Checklists maiores incluem os anteriores sem repetir itens iguais:
  - Trimestral = Mensal + extras trimestrais.
  - Semestral = Mensal + Trimestral + extras semestrais.
  - Anual = Mensal + Trimestral + Semestral + extras anuais.
- Observacao de `select_obs` deve aparecer somente quando a resposta indicar problema/sujeira.
- Medicoes devem ser por valor numerico, nao por pergunta "bom/ruim".

## Tipos de campo

| Tipo | Uso |
| --- | --- |
| `checkbox` | Confirmar etapa executada |
| `select` | Escolha fixa sem observacao |
| `select_obs` | Escolha fixa com observacao condicional |
| `numerico` | Valor medido com unidade |
| `texto` | Texto livre |
| `foto` | Foto vinculada ao item |
| `finalizacao` | Bloco final de assinatura/finalizacao da O.S. |

## Mensal - limpeza de filtros

| Codigo | Item | Tipo | Opcoes/observacao |
| --- | --- | --- | --- |
| M1 | EPIs utilizados | `checkbox` | Confirmar antes do servico |
| M2 | Desligar pelo controle remoto | `checkbox` |  |
| M3 | Disjuntores desligados e ambiente protegido | `checkbox` | Inclui ambiente desocupado ou protecao adequada |
| M4 | Foto inicial | `foto` | Foto do estado antes da limpeza |
| M5 | Retirar filtro | `checkbox` |  |
| M6 | Condicoes do filtro | `select` | limpo / sujo / danificado |
| M7 | Limpar filtro | `checkbox` |  |
| M8 | Aguardar secagem | `checkbox` |  |
| M9 | Inspecao interna | `select_obs` | Interna limpa / Interna suja. Observacao somente se suja |
| M10 | Bandeja do condensado | `select_obs` | Bandeja limpa / Bandeja suja. Observacao somente se suja |
| M11 | Reinstalar filtros | `checkbox` |  |
| M12 | Fechar tampa | `checkbox` |  |
| M13 | Ligar disjuntor | `checkbox` |  |
| M14 | Funcao Dry se existir por 10 minutos | `select` | realizado / nao existe |
| M15 | Temperatura de entrada do ar | `numerico` | unidade: `C` |
| M17 | Temperatura de insuflamento | `numerico` | unidade: `C` |
| M18 | Observacoes gerais | `texto` |  |
| M16 | Finalizacao | `finalizacao` | Nome, assinatura, GPS e data/hora da O.S. |

## Trimestral - extras

Inclui todos os itens mensais, sem duplicar desligamento, seguranca, filtros, medicoes ou finalizacao.

| Codigo | Item | Tipo | Opcoes/observacao |
| --- | --- | --- | --- |
| T1 | Aplicar higienizante | `checkbox` |  |
| T2 | Limpar serpentina evaporadora | `checkbox` |  |
| T3 | Dreno de escoamento | `select_obs` | ok / nao conforme |
| T4 | Gabinete e vedacoes | `select_obs` | ok / nao conforme |
| T5 | Ruidos e vibracoes | `select_obs` | ok / nao conforme |
| T6 | Fluxo de ar pelas aletas | `select_obs` | ok / nao conforme |

## Semestral - extras

Inclui Mensal + Trimestral + os itens abaixo.

| Codigo | Item | Tipo | Opcoes/observacao |
| --- | --- | --- | --- |
| S1 | Acesso a condensadora | `checkbox` |  |
| S2 | Limpar serpentina condensadora | `checkbox` |  |
| S3 | Foto da condensadora limpa | `foto` | Foto extra da condensadora apos limpeza |
| S4 | Oxidacao, entupimento, danos condensadora | `select_obs` | ok / nao conforme |
| S5 | Limpeza ventilador e helice | `select_obs` | ok / nao conforme |
| S6 | Pressao do fluido refrigerante | `numerico` | unidade: `bar/psi` |
| S7 | Tipo de fluido refrigerante | `texto` | Ex.: R-22, R-410A, R-32 |
| S8 | Inspecao eletrica: conexoes, bornes, cabos | `select_obs` | ok / nao conforme |
| S9 | Corrente eletrica de operacao | `numerico` | unidade: `A` |
| S10 | Estado das protecoes eletricas | `select_obs` | ok / nao conforme |
| S11 | Reinstalar componentes | `checkbox` |  |
| S12 | Religar e verificar operacao completa | `select_obs` | ok / nao conforme |

## Anual - extras

Inclui Mensal + Trimestral + Semestral + os itens abaixo.

| Codigo | Item | Tipo | Opcoes/observacao |
| --- | --- | --- | --- |
| A1 | Quantidade de intervencoes no ano | `numerico` |  |
| A2 | Avaliacao de desempenho geral | `texto` |  |
| A3 | Fixacoes mecanicas evaporadora/condensadora | `select_obs` | ok / nao conforme |
| A4 | Isolamento termico das tubulacoes | `select_obs` | ok / nao conforme |
| A5 | Conexoes de cobre: vazamentos, oxidacao | `select_obs` | ok / nao conforme |
| A6 | Capacidade atende ao ambiente? | `select_obs` | sim / nao |
| A7 | Relatorio consolidado anual | `texto` | Observacao tecnica anual |

## Pontos de atencao

- O checklist mensal precisa continuar facil no sol: campos grandes, contraste alto e pendencias em azul claro.
- A regra de fotos deve ser conferida no aparelho real:
  - Mensal e trimestral devem manter as fotos combinadas para a operacao.
  - Semestral e anual precisam da foto extra da condensadora limpa.
- Qualquer mudanca neste arquivo deve ser refletida no backend que monta o checklist mobile.
