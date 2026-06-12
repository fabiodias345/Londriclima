# Resumo AIRMOVEBR

Atualizado em: 12/06/2026

## Objetivo

Plataforma web/admin/API para a AIRMOVEBR, preparada para virar SaaS de servicos em campo:

```text
site -> pre-chamado -> painel admin -> OS -> tecnico -> evidencias/checklist/GPS -> relatorios
```

## Branch de Trabalho

- Branch atual: `seg`.
- Esta branch concentra as mudancas locais do painel web/admin.
- A branch foi criada para continuar o trabalho separado da `main`/`dev`.

## Estado Local

- Projeto local em `C:\develop\londriclima\Londriclima`.
- Docker instalado e usado para ambiente local.
- PostgreSQL local via Docker.
- Backend local esperado em:

```text
http://127.0.0.1:3000/api/v1/health
```

- Admin local:

```text
http://127.0.0.1:5173/admin/
```

- Landing local:

```text
http://127.0.0.1:5173/landing/
```

- Adminer local:

```text
http://127.0.0.1:8080
```

## Identidade da Empresa

- Nome visual adotado: `AIRMOVEBR`.
- Login seed/local:

```text
tecnico@airmovebr.local
senha: 123456
```

- O usuario enviou o novo logo no chat.
- Como a imagem ainda nao esta como arquivo no workspace, foi registrada a direcao visual em `docs/memoria.md`:
  - wordmark azul/grafite;
  - icone de ar-condicionado;
  - floco de neve com circuito;
  - arco circular;
  - subtitulo: `MANUTENCAO E REPARO DE AR CONDICIONADO`.

Quando o arquivo PNG/JPG/SVG do logo for anexado ou salvo na pasta do projeto, aplicar no admin e na landing.

## Web/Admin

O painel admin tem:

- Login.
- Pre-chamados.
- Frota.
- Agenda.
- Clientes.
- PMOC.
- Relatorios.

### Frota

Mudancas feitas:

- Removido o mapa falso com ruas desenhadas por CSS.
- Instalado Leaflet local em `apps/admin/vendor/leaflet/`.
- Mapa agora usa Leaflet com OpenStreetMap.
- Todos os carros aparecem no mapa ao abrir Frota.
- Lista lateral mostra os veiculos monitorados.
- Ao clicar em um carro na lista, o mapa da zoom naquele carro.
- Frota foi separada em abas:
  - `Mapa`;
  - `Consumo`;
  - `Abastecimentos`.
- `Consumo` tem botao `Gerar relatorio`.
- `Abastecimentos` tem historico e registro manual para caso o tecnico esqueca de preencher em campo.

### Agenda

Mudancas feitas:

- A tela antiga era uma lista solta e pouco operacional.
- Agora a agenda tem calendario no topo.
- Cada data mostra quantidade de OS.
- Ao clicar em uma data, abre a grade de horarios do dia.
- Horarios exibidos de `07:00` ate `18:00`.
- Cada servico mostra:
  - titulo;
  - cliente;
  - endereco;
  - status;
  - horario;
  - equipe ou tecnico responsavel.
- OS sem horario definido aparecem destacadas em `Sem horario definido`, para o despacho corrigir.

### PMOC

O PMOC foi redesenhado para nao ser um checklist solto.

Regras atuais:

- cliente pode ter ou nao PMOC;
- PMOC pertence a um cliente especifico;
- cliente sem PMOC nao aparece na lista principal de PMOC;
- cliente sem PMOC so aparece quando for pesquisado;
- ao encontrar cliente sem PMOC, o sistema pergunta se deseja adicionar PMOC;
- se aceitar, o sistema cadastra o PMOC e pede o engenheiro responsavel;
- cada cliente PMOC precisa ter dossie proprio;
- maquinas e OS nao podem se misturar entre clientes;
- o relatorio final precisa sair maquina por maquina dentro do mesmo cliente;
- o fluxo precisa manter separacao por cliente para futura assinatura e envio ao cliente.

O que ja foi feito:

- removemos o PMOC antigo em forma de checklist;
- criamos a busca de cliente com triagem por PMOC;
- criamos a lista de clientes com PMOC ativo;
- criamos a entrada para ativar PMOC em cliente sem cadastro anterior;
- criamos o dossie do cliente;
- criamos dados de demo para a Maria com PMOC, engenheiro, maquinas e OS;
- criamos a previa oficial do relatorio PMOC no backend;
- o backend agora devolve cliente, engenheiro, periodo, maquinas, OS, checklist, evidencias, assinatura e pendencias;
- os testes do backend e do frontend passaram com o novo fluxo.

As 4 etapas que faltam do PMOC:

1. Fazer a tela do admin consumir a previa oficial do backend.
2. Gerar o PDF real do PMOC no servidor.
3. Criar o fluxo de assinatura do engenheiro responsavel.
4. Enviar o relatorio assinado ao cliente e guardar o historico final.

## Backend

- NestJS + Prisma + PostgreSQL.
- Auth com JWT, refresh token e senha com `scrypt`.
- Seed atualizado para AIRMOVEBR.
- Health reporta `airmovebr-backend`.

Endpoints principais:

```text
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/site/pre-chamados
GET  /api/v1/admin/pre-chamados
GET  /api/v1/admin/frota/localizacoes
GET  /api/v1/admin/agenda
GET  /api/v1/admin/clientes
GET  /api/v1/admin/relatorios
GET  /api/v1/admin/relatorios/frota
POST /api/v1/admin/frota/abastecimentos
```

## Testes e Validacoes

Ultimas validacoes locais:

```text
npm run frontend:test -> 6/6 OK
node --check apps/admin/script.js -> OK
admin local http://127.0.0.1:5173/admin/ -> 200
```

Validacoes anteriores tambem passaram:

```text
npm run backend:test -> 51/51 OK
npm run backend:build -> OK
npm run backend:prisma:seed -> OK
```

## Producao / DNS

Estado conhecido da VM:

- Dominio oficial: `airmovebr.com.br`.
- VM Locaweb Cloud: Ubuntu 24.04.3 LTS.
- IP publico: `191.252.226.11`.
- Deploy na VM em `/opt/airmovebr/repo`.
- Usuario operacional: `airmovebr`.
- Firewall UFW ativo: 22, 80 e 443 liberadas.
- Docker e Docker Compose instalados.
- PostgreSQL e backend ja foram testados em Docker.

Nao mexer na publicacao do servidor nem subir o Caddy ate o cliente liberar/ajustar o DNS no Registro.br.

Registros DNS desejados:

```text
airmovebr.com.br       -> 191.252.226.11
admin.airmovebr.com.br -> 191.252.226.11
api.airmovebr.com.br   -> 191.252.226.11
```

Depois que DNS estiver correto:

```text
cd /opt/airmovebr/repo
docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml up -d caddy
```

Validar:

```text
https://airmovebr.com.br
https://admin.airmovebr.com.br
https://api.airmovebr.com.br/api/v1/health
```

## O Que Falta No Todo

- consolidar o fluxo de Clientes com equipamentos e historico de OS;
- ligar o PMOC ao cadastro real de clientes e maquinas;
- fechar o PDF com assinatura e envio por e-mail;
- registrar historico por cliente, maquina e engenharia responsavel;
- manter separado o relatorio tecnico comum do relatorio PMOC;
- revisar o visual geral do admin para o PMOC ficar bonito e simples de operar;
- depois disso, fechar homologacao com dados reais e parar de depender de demo.

## Proximos Passos Para Amanha

1. Ligar a tela de PMOC ao endpoint oficial de previa.
2. Comecar a geracao real do PDF do PMOC.
3. Desenhar o fluxo de assinatura do engenheiro.
4. Definir o envio final por e-mail para o cliente.
5. Revisar a Agenda.
6. Revisar a Frota.

## Atencao LGPD/Seguranca

- Nao commitar `.env.production`.
- Banco de producao sem porta publica.
- Antes de cliente real:
  - backup automatico;
  - logs sem dados sensiveis;
  - revisao de permissoes/admin;
  - politica clara de acesso por tecnico/supervisor/admin.
