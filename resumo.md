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
- `VeiculoAbastecimento`

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
- mapa operacional da frota com OpenStreetMap e fallback local;
- lista de veiculos com placa, velocidade e ultimo sinal;
- aba Agenda;
- aba Clientes;
- aba Relatorios;
- formulario de abastecimento;
- relatorio de consumo por veiculo.

Endpoints admin:

```text
GET   /api/v1/admin/pre-chamados
PATCH /api/v1/admin/pre-chamados/:osId/aprovar
PATCH /api/v1/admin/pre-chamados/:osId/rejeitar
GET   /api/v1/admin/agenda
GET   /api/v1/admin/clientes
GET   /api/v1/admin/relatorios
GET   /api/v1/admin/frota/localizacoes
GET   /api/v1/admin/frota/abastecimentos
POST  /api/v1/admin/frota/abastecimentos
GET   /api/v1/admin/relatorios/frota
```

### Frota / GPS

Ja foi criada a base para monitoramento de frota.

Implementado:

- tabelas `veiculos` e `veiculo_localizacoes`;
- tabela `veiculo_abastecimentos`;
- migration `20260610035303_add_vehicle_tracking`;
- migration `20260610110000_add_vehicle_fuelings`;
- seed com dois veiculos;
- endpoint de ultima localizacao;
- registro de abastecimento por veiculo;
- calculo de km rodados, litros, km/L, custo por km e gasto total;
- aba Frota no admin.

Decisao adicional:

- consumo da frota deve usar odometro informado no abastecimento;
- o tecnico informa litros, valor total, odometro e posto;
- GPS ajuda no monitoramento, mas o calculo financeiro confiavel vem do odometro e abastecimentos reais.

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

## Atualizacao desta rodada

### Web/admin

Foco colocado no web antes do Flutter.

Foi feito:

- login admin com melhor tratamento de erro e carregamento;
- abas Pre-chamados, Frota, Agenda, Clientes e Relatorios funcionando;
- Frota com carros separados visualmente para demonstracao ao cliente;
- mapa com OpenStreetMap quando disponivel e fallback operacional quando nao carregar;
- Agenda mostrando OS agendadas/pendentes;
- Clientes mostrando base de clientes, equipamentos e enderecos;
- Relatorios mostrando indicadores operacionais;
- Relatorios de frota com km rodados, litros abastecidos, valor total, km/L e custo por km;
- formulario no admin para registrar abastecimento com odometro, litros, valor e posto.

### Backend e seguranca

Foi reforcado:

- endpoints admin usando `empresa_id` para isolamento multi-tenant;
- testes de autenticacao, token, senha e guard JWT;
- testes de servicos principais;
- regra de finalizacao de OS para salvar assinatura somente depois de validar acesso, empresa e estado da OS;
- cobertura inicial automatizada para reduzir risco antes de avancar em funcionalidades sensiveis.

Testes criados:

```text
npm.cmd run backend:test
npm.cmd run frontend:test
```

Na ultima validacao, o backend passou com 51 testes e o frontend passou com 5 testes.

### Documentacao

Atualizado `docs/telemetria-gps.md` com:

- abastecimentos por veiculo;
- odometro como fonte confiavel para calculo financeiro;
- km/L;
- custo por km;
- diferenca entre GPS para monitoramento e odometro/abastecimento para consumo real.

## Proximo passo recomendado

### Fase seguinte: consolidar o MVP web/admin

Prioridade sugerida:

1. Aplicar a migration `20260610110000_add_vehicle_fuelings` no banco local/producao.
2. Rodar o seed atualizado para demonstracao com carros separados e abastecimentos.
3. Melhorar aprovacao de pre-chamado para definir agenda, equipe e tecnico.
4. Criar cadastro/edicao real de clientes, enderecos e equipamentos.
5. Criar historico de abastecimentos com filtro por veiculo e periodo.
6. Criar alertas de frota: odometro menor que o anterior, consumo muito baixo/alto, custo por km alto e veiculo sem abastecimento recente.
7. Criar relatorio PDF real da OS.
8. Depois disso, iniciar app Flutter com o fluxo do tecnico em campo.

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



# O que precisa de atencao:
- Testes iniciais ja foram criados, mas precisam crescer junto com aprovacao, agenda, clientes, relatorios e permissoes.
- JWT customizado ao inves de @nestjs/jwt funciona, mas deve ser revisado antes de producao.
- Motores de automacao (PDF, email, WhatsApp) estao sendo criados no banco, mas ainda nao existe worker processando.
- App mobile Flutter tem so `.gitkeep`; o core do tecnico em campo ainda precisa ser construido.
- Mapa da frota agora tem OpenStreetMap embed com fallback operacional, mas ainda nao e telemetria real.
- Secrets placeholders (`change-me-access`) estao no `.env.example`; antes de producao, revisar politica de secrets.

Resumo: Caminho certo. O backend agora esta mais protegido por testes, o admin web ficou mais apresentavel para demonstracao, e a frota ganhou consumo/custo por veiculo. O proximo passo logico e consolidar o MVP web/admin antes de abrir a frente do Flutter.
