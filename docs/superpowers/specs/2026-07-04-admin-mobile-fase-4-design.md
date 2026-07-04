# App Admin Mobile - Fase 4

## Objetivo

Finalizar a experiencia do app administrativo em celulares pequenos, mantendo os modulos existentes e sem ampliar o escopo de notificacoes ou build de APK.

## Escopo

- Busca local nas listas por titulo, cliente, placa, tecnico e status.
- Filtros contextuais em chips, conforme os dados de cada modulo.
- Layout compacto e responsivo baseado na opcao A aprovada.
- Abertura autenticada de PDF PMOC e relatorio avulso no visualizador do aparelho.
- Frota somente para consulta, com visualizacao dos detalhes do veiculo.
- Estados de carregamento, vazio, erro e tentativa novamente.

## Fora do escopo

- Criacao ou edicao de veiculos.
- Registro de abastecimento ou quilometragem.
- Notificacoes, dependentes da definicao Meta e telefone.
- Build ou distribuicao do APK admin.
- Alteracoes nas regras dos apps tecnico e admin web.

## Interface

A tela de modulo preserva o cabecalho e os indicadores atuais. Abaixo deles, exibe busca sempre visivel, seguida por chips de filtro quando houver categorias relevantes. Os resultados usam linhas compactas, com titulo, resumo e estado ou data, priorizando quantidade de itens visiveis em telas estreitas.

Os indicadores devem se adaptar sem estouro horizontal. Espacamentos, tamanhos e textos devem permanecer legiveis em larguras pequenas. A busca e os filtros atuam sobre os dados ja carregados, sem nova chamada de rede.

## Comportamento por modulo

- O.S. e Agenda: busca por O.S., cliente, tecnico e status; filtros por status operacional.
- Clientes e PMOC: busca por cliente e engenheiro; filtros PMOC aplicaveis.
- Frota: busca por nome, placa e IMEI; filtro ativo/inativo; toque abre detalhes somente leitura.
- Relatorios: lista clientes com relatorio avulso disponivel e permite abrir o PDF.
- Tecnicos: busca por nome, email e papel; filtros por papel.
- Pendencias: busca por solicitacao e cliente; filtros conforme o tipo de pendencia.

## PDF

O app solicita o PDF pelo endpoint administrativo autenticado, grava o arquivo temporariamente e solicita sua abertura no visualizador padrao do aparelho. Endpoints:

- `GET /api/v1/admin/pmoc/clientes/:clienteId/pdf`
- `GET /api/v1/admin/relatorios-avulsos/clientes/:clienteId/pdf`

Falhas de rede, resposta invalida ou ausencia de aplicativo capaz de abrir o arquivo geram mensagem curta e permitem nova tentativa.

## Estrutura tecnica

- `ModuleScreen` mantem consulta, filtro selecionado e dados carregados.
- `ModuleData` entrega linhas completas; a tela calcula a lista visivel.
- `ModuleRow` inclui campos pesquisaveis, categoria de filtro e acao de consulta.
- `AdminApiClient` recebe uma operacao de download binario autenticado.
- Um servico de arquivo temporario abre o PDF sem expor o token na URL.
- O detalhe de frota usa painel modal somente leitura.

## Validacao

- Busca encontra valores em campos secundarios e ignora diferenca entre maiusculas e minusculas.
- Filtros combinam corretamente com a busca.
- Limpar busca e filtro restaura todos os itens.
- Layout nao apresenta overflow em largura pequena.
- Acoes de PMOC e relatorio usam o endpoint correto.
- Frota nao apresenta controles de alteracao.
- `flutter analyze --no-pub` termina sem problemas.

## Criterios de aceite

- Todos os modulos com listas possuem busca funcional.
- Modulos com estados distintos possuem filtros em chips.
- O app permanece utilizavel em celular pequeno.
- PDFs PMOC e avulso abrem pelo fluxo autenticado.
- Frota permanece estritamente somente leitura.
- Nenhuma notificacao ou APK e produzido nesta fase.
