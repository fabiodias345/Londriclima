# Telemetria GPS da Frota

## Decisao

Decisao registrada em 10/06/2026: para a frota inicial da LondriClima, estimada em 5 a 6 carros, a plataforma devera evitar mensalidade de rastreamento por veiculo em plataformas externas.

A direcao aprovada e implementar, em fase futura, um receptor proprio de GPS/telemetria em VPS Linux, capaz de receber pacotes TCP/UDP dos rastreadores fisicos dos carros.

Exemplos de rastreadores-alvo:

- SinoTrack
- Coban
- Concox
- similares com protocolo TCP/UDP documentado

## Arquitetura Prevista

```text
Rastreador no carro
-> chip de dados/M2M
-> IP publico da VPS + porta TCP/UDP
-> receptor de telemetria
-> PostgreSQL
-> painel administrativo
```

## Diretrizes

- Identificar cada veiculo pelo IMEI do rastreador.
- Persistir localizacao no PostgreSQL nas tabelas `veiculos` e `veiculo_localizacoes`.
- Exibir a ultima posicao no painel administrativo com mapa da frota.
- Registrar abastecimentos em `veiculo_abastecimentos` com odometro, litros, valor total e usuario responsavel.
- Calcular consumo por carro a partir do odometro informado no abastecimento, nao apenas por GPS.
- Usar dois abastecimentos do mesmo veiculo para calcular km rodados, km/L e custo por km.
- Rodar no mesmo servidor da API no MVP, desde que a VPS permita porta TCP/UDP exposta.
- Evitar hospedagens HTTP/serverless comuns para o receptor GPS, pois rastreadores dependem de conexao TCP/UDP e porta configuravel.
- Custo recorrente principal previsto: chip de dados/M2M por carro.

## Custo e Escala

Para 5 ou 6 carros, o volume de dados e baixo. Uma VPS pequena tende a ser suficiente no inicio:

```text
1 vCPU
1 GB RAM
20 GB SSD
Ubuntu Linux
```

O receptor deve ser isolado como modulo/servico proprio para permitir troca futura de protocolo ou separacao em outro servidor caso a frota cresca.

## Status

Implementado agora:

- tabelas `veiculos` e `veiculo_localizacoes`;
- tabela `veiculo_abastecimentos`;
- seed local com dois veiculos de teste;
- endpoint admin para ultima localizacao da frota;
- endpoints admin para registrar/listar abastecimentos;
- relatorio de frota com km rodados, litros, km/L, custo por km e gasto total;
- tela inicial de frota no painel administrativo.

Implementar mais a frente:

- receptor TCP/UDP real;
- parser do protocolo do rastreador escolhido;
- configuracao de IP/porta no rastreador fisico;
- mapa com tiles reais do OpenStreetMap/Leaflet;
- historico de percurso e alertas.

## Abastecimento e Consumo

O tecnico deve informar cada abastecimento com:

- veiculo;
- odometro atual;
- litros abastecidos;
- valor total;
- posto e observacao, quando houver.

O backend calcula automaticamente:

- preco por litro;
- km rodados entre abastecimentos;
- media km/L;
- custo por km;
- gasto total por veiculo.

Essa regra e importante porque GPS pode estimar deslocamento, mas o consumo financeiro confiavel depende do odometro e do abastecimento real.
