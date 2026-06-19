# Cadastro de veiculos na frota

## Objetivo

Completar o CRUD de veiculos iniciado no commit `c385cc5` e disponibiliza-lo no painel administrativo.

## Interface

A tela Frota recebe a aba `Veiculos`, ao lado de Mapa, Consumo e Abastecimentos. A aba contem um formulario com nome obrigatorio, placa e IMEI opcionais, alem da lista de veiculos ativos com acoes para editar e excluir.

## API

O controller administrativo expoe `GET`, `POST`, `PATCH` e `DELETE` em `/admin/frota/veiculos`. O `AdminService` delega ao `AdminFrotaService`, que restringe todas as operacoes a empresa autenticada e usa exclusao logica.

## Comportamento

Salvar recarrega a lista, o mapa e as opcoes de abastecimento. Editar preenche o formulario. Excluir pede confirmacao e remove o veiculo das listas ativas. Erros da API aparecem na propria aba.

## Validacao

Os contratos frontend verificam estrutura, chamadas e eventos. Os testes backend verificam delegacao e rotas, seguidos de build e lint completos.
