# Resumo do Projeto LondriClima

Atualizado em: 10/06/2026

## Objetivo

Construir a plataforma digital da LondriClima como cliente piloto, mas com arquitetura preparada para virar SaaS multi-tenant para empresas com operacao em campo.

O produto nao e apenas um site. E um sistema de gestao de servicos externos:

```text
site / WhatsApp
-> pre-chamado
-> painel administrativo
-> ordem de servico
-> tecnico em campo
-> fotos, checklist, assinatura e GPS
-> relatorio e pos-venda
-> recorrencia
```

## O que ja foi feito

### Backend

Backend NestJS em `apps/backend`.

Ja existe:

- `ConfigModule` com `.env`;
- `PrismaService`;
- health check em `GET /api/v1/health`;
- CORS habilitado para frontend local;
- PostgreSQL via Docker;
- schema Prisma inicial;
- migrations aplicadas;
- seed de desenvolvimento.

### Banco de Dados

Banco PostgreSQL com Prisma.

Principais entidades ja modeladas:

- `Empresa`
- `Usuario`
- `Equipe`
- `EquipeAuxiliar`
- `Cliente`
- `ClienteEndereco`
- `Equipamento`
- `OrdemServico`
- `OrdemServicoEvento`
- `OrdemServicoEvidencia`
- `OrdemServicoChecklist`
- `OrdemServicoPeca`
- `OrdemServicoAssinatura`
- `OrdemServicoObservacao`
- `AutomacaoAgendada`
- `Veiculo`
- `VeiculoLocalizacao`

O banco ja nasce com `empresa_id` nas tabelas transacionais para preparar o SaaS multi-tenant.

### Autenticacao

Modulo em `apps/backend/src/modules/auth`.

Ja existe:

- `POST /api/v1/auth/login`;
- `POST /api/v1/auth/refresh`;
- hash de senha com `scrypt`;
- JWT access token;
- refresh token;
- guard `JwtAuthGuard`;
- decorator `CurrentUser`.

Usuario local de teste:

```text
email: tecnico@londriclima.local
senha: 123456
```

### Fluxo de Ordem de Servico

Modulo em `apps/backend/src/modules/ordens-servico`.

Endpoints implementados:

```text
PATCH /api/v1/os/:osId/status
PUT   /api/v1/os/:osId/identificacao-equipamento
POST  /api/v1/os/:osId/evidencia-inicial
POST  /api/v1/os/:osId/checklist
POST  /api/v1/os/:osId/evidencia-final
PATCH /api/v1/os/:osId/observacoes
POST  /api/v1/os/:osId/finalizar
```

Regras ja implementadas:

- OS concluida e imutavel;
- transicoes de status validadas;
- GPS por evento;
- evidencia inicial obrigatoria antes do checklist;
- checklist obrigatorio antes de finalizar;
- evidencia final obrigatoria antes de finalizar;
- assinatura obrigatoria na finalizacao;
- ao finalizar, cria automacoes:
  - `gerar_pdf`;
  - `enviar_email`;
  - `enviar_whatsapp`;
  - `recorrencia_180_dias`.

### Site / Landing

Landing em `apps/landing`.

Ja existe:

- pagina institucional visual;
- hero com imagem gerada;
- secao de servicos;
- explicacao do fluxo digital;
- formulario de agendamento;
- integracao com backend.

Endpoint publico:

```text
POST /api/v1/site/pre-chamados
```

O formulario cria um `pre_chamado` real no banco.

### Painel Admin

Painel estatico em `apps/admin`.

Ja existe:

- tela de login;
- consumo do JWT;
- listagem de pre-chamados;
- aprovar pre-chamado;
- rejeitar pre-chamado;
- aba Frota;
- mapa operacional simples da frota;
- lista de veiculos com placa, velocidade e ultimo sinal.

Endpoints admin:

```text
GET   /api/v1/admin/pre-chamados
PATCH /api/v1/admin/pre-chamados/:osId/aprovar
PATCH /api/v1/admin/pre-chamados/:osId/rejeitar
GET   /api/v1/admin/frota/localizacoes
```

### Frota / GPS

Ja foi criada a base para monitoramento de frota.

Implementado:

- tabelas `veiculos` e `veiculo_localizacoes`;
- migration `20260610035303_add_vehicle_tracking`;
- seed com dois veiculos;
- endpoint de ultima localizacao;
- aba Frota no admin.

Decisao importante documentada em `docs/telemetria-gps.md`:

- no futuro, criar receptor proprio TCP/UDP em VPS Linux;
- evitar plataforma externa de rastreamento por veiculo;
- pensado para frota inicial de 5 a 6 carros;
- custo principal previsto: chip de dados/M2M por carro;
- rastreadores alvo: SinoTrack, Coban, Concox ou similares.

## Como rodar localmente

### Banco

```bash
npm.cmd run docker:up
```

### Backend

```bash
npm.cmd run backend:prisma:migrate
npm.cmd run backend:prisma:seed
npm.cmd run backend:dev
```

Backend:

```text
http://localhost:3000/api/v1
```

Health:

```text
http://localhost:3000/api/v1/health
```

### Landing

```bash
npm.cmd exec -- serve apps/landing -l 5173
```

URL:

```text
http://localhost:5173
```

### Admin

```bash
npm.cmd exec -- serve apps/admin -l 5174
```

URL:

```text
http://localhost:5174
```

Login:

```text
tecnico@londriclima.local
123456
```

## Ultimos commits importantes

```text
aa7cf5d feat: add admin fleet monitoring
327d265 feat: add MVP backend flow and landing site
8b00ade Add initial database migration and seed
```

## Onde paramos

Paramos depois de:

- colocar site/landing funcionando;
- integrar formulario do site com pre-chamado real;
- criar backend de OS completo para o fluxo tecnico;
- criar autenticacao JWT;
- criar painel admin minimo;
- criar aprovacao/rejeicao de pre-chamados;
- criar base de frota/GPS;
- documentar a decisao de telemetria propria em VPS.

O reposititorio foi enviado para o GitHub na branch `dev`.

## Proximo passo recomendado

### Fase seguinte: melhorar o painel admin

Prioridade sugerida:

1. Trocar o mapa esquematico da Frota por Leaflet + OpenStreetMap.
2. Criar visualizacao de OS abertas no painel.
3. Criar acao de agendamento/equipe ao aprovar um pre-chamado.
4. Melhorar cadastro de clientes/equipamentos.
5. Criar relatorio PDF real.
6. Depois disso, iniciar app Flutter.

### Telemetria GPS real fica para depois

Nao implementar receptor TCP/UDP agora. Ja deixamos a base de banco, seed, endpoint e documento. Quando chegar a hora:

1. escolher rastreador fisico;
2. obter protocolo/documentacao;
3. configurar chip e IP/porta;
4. criar servico receptor;
5. testar pacote real chegando na VPS;
6. gravar em `veiculo_localizacoes`.

## Ideia de produto

A LondriClima e o cliente piloto, mas o sistema pode ser vendido para outros segmentos com operacao em campo:

- assistencia tecnica;
- solar;
- construtoras;
- lojas de material de construcao;
- floriculturas com entrega;
- dedetizadoras;
- limpeza de estofados;
- piscinas;
- vidracarias;
- marcenarias;
- instaladores e manutencao predial.

O nucleo e reutilizavel:

```text
chamado / pedido / entrega
-> equipe / motorista / tecnico
-> status
-> rota / frota
-> fotos / comprovante / assinatura
-> relatorio
-> pos-venda / recorrencia
```

Esse e o caminho para transformar o piloto em SaaS.
