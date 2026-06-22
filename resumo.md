# Resumo AIRMOVEBR

Atualizado em: 22/06/2026

## Estado operacional

- Workspace: `C:\develop\Londriclima`
- Branch atual: `dev`
- Commit atual: `75a4b12`
- `dev`, `main`, `origin/dev` e `origin/main` apontam para o mesmo commit.
- Arvore de trabalho contem mudancas da frente mobile/backend ainda nao commitadas.
- Commit, push e deploy sao feitos manualmente pelo usuario.

## APK tecnico AIRMOVEBR

Status: Fases 1 a 12 concluidas em desenvolvimento local. O teste principal agora deve ser no celular usando a API local.

### Fase 1 - Dashboard mobile

- App Flutter Android criado em `apps/mobile`.
- Login de teste local sem API: `teste / 123456`.
- Dashboard com resumo de OS, filtros e lista de atendimentos.
- Dados fake locais para testar layout sem depender de backend.

### Fase 2 - Detalhe da OS

- Toque no card abre a tela de detalhes.
- Detalhe mostra cliente, endereco, tipo de manutencao, checklist previsto e obrigatorios da execucao.
- Botao de inicio de servico preparado na tela.

### Fase 2.1 - Varias maquinas no mesmo local

- Uma OS pode listar varios equipamentos do mesmo cliente/endereco.
- Dashboard mostra contagem de equipamentos.
- Detalhe lista todas as maquinas do atendimento.

### Fase 3 - API mobile no backend

- Criado modulo backend `apps/backend/src/modules/mobile`.
- Endpoints:

```text
GET /api/v1/mobile/os
GET /api/v1/mobile/os/:id
```

- API filtra OS pelo tecnico logado, responsavel direto ou equipe.
- Retorno inclui equipamentos do cliente para o APK listar varias maquinas.

### Fase 4 - Login real e integracao API

- APK aceita `--dart-define=MOBILE_API_BASE_URL`.
- Sem URL, usa dados fake locais.
- Com URL, faz login real em `/api/v1/auth/login` e carrega `/api/v1/mobile/os`.
- API local validada em `http://127.0.0.1:3000/api/v1/health`.
- Producao validada online:

```text
https://api.airmovebr.com.br/api/v1/health
https://admin.airmovebr.com.br/
https://airmovebr.com.br/
```

### Fase 5 - Iniciar atendimento com GPS

- Criado servico de localizacao no APK usando `geolocator`.
- AndroidManifest recebeu permissao de localizacao.
- Botao `Iniciar atendimento` captura GPS e chama:

```text
PATCH /api/v1/os/:osId/status
acao: iniciar_atendimento
```

- Backend muda a OS direto para `em_atendimento`.
- APK mostra a OS como `Em andamento`.
- Seed demo local criado em `apps/backend/prisma/seed_mobile_demo.ts`.
- Tecnico local validado: `tecnico@airmovebr.local / 123456`.
- API local retornou 4 OS para o tecnico, incluindo `Hospital Norte - Demo Mobile` com 3 equipamentos.

### Fase 6 - Selecionar ou cadastrar maquina

- Depois de iniciar atendimento, APK mostra maquinas do cliente.
- Tecnico pode selecionar maquina existente ou cadastrar nova maquina.
- Cadastro minimo: QR/codigo, tipo, marca, modelo, BTUs, gas, numero de serie e local instalado.
- Se dado obrigatorio estiver indisponivel, tecnico marca `Impossivel coletar dados` e informa observacao.
- Checklist fica bloqueado ate cadastro estar completo ou justificado.

### Fase 7 - Checklist definido pela recorrencia

- Banco recebeu enum `checklist_tipo`: `mensal`, `trimestral`, `semestral`, `anual`.
- Planos de recorrencia gravam `checklist_tipo`.
- OS gerada pela recorrencia herda o checklist definido no plano.
- API mobile envia `checklist_tipo` e checklist flat ja expandido.
- Debito tecnico: OS antigas ou criadas fora da recorrencia usam default `mensal` ate o admin expor seletor claro.

### Fase 8 - Selecionar maquina antes do checklist

- Depois de `Iniciar atendimento`, APK mostra a lista de maquinas da OS.
- Tecnico pode buscar por TAG/id, local ou modelo.
- Checklist so fica disponivel depois de selecionar uma maquina.
- QR/barcode fica para fase futura.

### Fase 9 - Renderizar checklist flat no app

- Botao `Iniciar checklist` abre a lista de itens da maquina selecionada.
- APK renderiza campos conforme `tipo` vindo da API:

```text
checkbox
select
select_obs
numerico
texto
foto
finalizacao
```

- Itens `foto` aparecem como acao de camera preparada, ainda sem upload real.
- Itens `finalizacao` aparecem como bloco informativo para a etapa final da OS.

### Fase 10 - Salvar checklist preenchido

- APK guarda respostas dos campos `checkbox`, `select`, `select_obs`, `numerico` e `texto`.
- Botao `Salvar checklist` envia as respostas da maquina selecionada para:

```text
POST /api/v1/os/:osId/checklist
```

- Payload inclui `equipamento_id`, `checklist_tipo`, `procedimentos` e `respostas`.
- Backend persiste respostas estruturadas por OS, maquina e codigo do item.

### Fase 10.1 - Cadastro guiado de maquina

- Campo `Tipo` virou seletor: Split, Cassete, Piso teto, Condensadora, Janela, VRF ou Outro.
- Campo `Gas refrigerante` virou seletor: R-22, R-410A, R-32, R-134a ou Outro.
- Campo `BTUs` usa teclado numerico.
- Nova maquina cadastrada no atendimento libera o checklist sem precisar reinstalar APK.

### Fase 11 - Fotos dentro dos itens do checklist

- Itens `foto` do checklist agora abrem a camera do APK.
- Cada foto e enviada para a API e vinculada por OS, maquina e codigo do item.
- Backend salva o arquivo em storage local e retorna `storage_url`.
- Ao salvar checklist, o valor do item `foto` passa a ser a URL da foto registrada.

### Fase 12 - Assinatura e finalizacao da OS

- APK registra foto antes da OS pelo endpoint de evidencia inicial.
- Foto `antes` tirada dentro do checklist tambem registra automaticamente a evidencia inicial exigida pelo backend.
- Checklist fica bloqueado ate a foto antes/evidencia inicial ser registrada, alinhado com a regra do backend.
- Depois da foto antes, APK libera foto depois, nome do responsavel e campo de assinatura.
- Botao `Finalizar OS` continua bloqueado ate o checklist ser salvo, porque o backend exige checklist registrado.
- Finalizacao envia assinatura, responsavel, GPS final e data/hora para:

```text
POST /api/v1/os/:osId/finalizar
```

- Ao concluir, a OS muda para `concluida` e a tela mostra `OS finalizada.`.
- Se a API rejeitar o checklist, o APK mostra a mensagem real retornada pela API.

### Ajustes feitos apos teste no celular

- Corrigido campo `Nome do responsavel`, que estava bloqueado ate salvar checklist.
- Corrigido campo de assinatura, que estava bloqueado ate salvar checklist.
- Corrigido botao/foto depois, que estava bloqueado ate salvar checklist.
- Corrigido salvamento do checklist quando a foto antes ja tinha sido tirada dentro do checklist.

### Fase 12.1 - UX do fluxo de atendimento

- Tela longa do atendimento foi dividida em abas: Dados, Maquinas, Checklist e Finalizar.
- Ao iniciar atendimento, o APK vai direto para Maquinas.
- Ao iniciar checklist, o APK vai direto para Checklist.
- Ao salvar checklist com sucesso, o APK vai direto para Finalizar.
- `Salvar checklist` valida itens obrigatorios antes de enviar para API e mostra o primeiro item faltando.
- Campos simples do checklist e cadastro usam `avancar` no teclado em vez de abrir nova linha.
- Foto do checklist agora e tratada como obrigatoria para salvar quando o item existir.

### Fase 13 - Fila offline de sincronizacao

- Login real via API agora usa um reposititorio com fila offline.
- Se checklist, fotos ou finalizacao falharem por falta de rede, o APK grava a acao em fila local.
- OS com acoes pendentes aparece como `Aguardando sync`.
- Botao de sincronizacao do dashboard tenta reenviar a fila e mostra quantos itens sincronizaram ou ficaram pendentes.
- A fila evita perder checklist/fotos/finalizacao quando a internet cai durante o atendimento.
- Limitacao atual: cadastro/inicio de atendimento ainda dependem de rede; offline completo de abertura/cadastro fica para fase futura se necessario.

### Ponto de retomada

- Instalar/testar o APK debug mais recente no celular.
- Validar no celular o fluxo completo:
  1. iniciar atendimento;
  2. selecionar maquina;
  3. tirar foto antes;
  4. preencher e salvar checklist;
  5. tirar foto depois;
  6. preencher nome, assinar e finalizar OS.
- Se passar no celular, fazer commit, push e deploy.
- Se falhar, ler a mensagem exibida na tela e corrigir o ponto exato.

### Pendencias de UX e funcionalidade do APK

- Melhorar visual geral: APK esta simples, feio e com pouca cor; precisa identidade visual mais clara da AIRMOVEBR.
- Checklist ainda esta generico/demo em alguns pontos; precisa virar checklist real por tipo de servico/manutencao.
- Resolver checklist real na ultima fase antes de considerar o APK funcional para operacao.
- Revisar textos e labels para linguagem de tecnico em campo, evitando termos confusos.
- Fluxo precisa ficar funcional para uso real, nao apenas tecnicamente integrado com a API.

### Como testar no celular

Backend local precisa estar rodando na maquina:

```text
npm.cmd run backend:dev
```

Rodar o APK conectado na API local:

```text
cd C:\develop\LondriClima\apps\mobile
flutter run --dart-define=MOBILE_API_BASE_URL=http://10.91.93.11:3000
```

Se falhar no celular, testar no navegador do celular:

```text
http://10.91.93.11:3000/api/v1/health
```

### Validacoes executadas

```text
flutter test
flutter analyze
flutter build apk --debug
npm.cmd run backend:build
npm.cmd run backend:test
```

APK debug:

```text
C:\develop\LondriClima\apps\mobile\build\app\outputs\flutter-apk\app-debug.apk
```

### Proximas fases do APK

1. Confirmar Fase 13 no celular real e depois commitar/subir.
2. Fase 14: leitura de codigo de barras/QR por equipamento.
3. Fase 15: polimento visual, icon/app name, checklist real por tipo de servico e APK release.

## Prioridade aprovada: novo PDF PMOC

Status: desenho aprovado em 20/06/2026. Nao implementar, cadastrar dados ou gerar PDF ate o usuario pedir para continuar.

### Regra de preservacao

- Alterar somente a apresentacao do PDF.
- Preservar o fluxo funcional atual: previa -> PDF -> Assinafy -> SMTP.
- Nunca misturar clientes ou maquinas entre documentos.
- Gerar um PDF independente para cada cliente e endereco.
- Extrair o gerador visual de `admin-relatorio-tecnico-core.service.ts`, mantendo o servico principal como orquestrador.

### Layout aprovado

Modelo A, tecnico modular, inspirado apenas na organizacao visual da ART e dos PMOCs fornecidos:

1. Capa AIRMOVEBR com numero do PMOC, cliente, endereco, emissao e renovacao.
2. Dados do cliente, empresa contratada, engenheiro e ART.
3. Objetivo, responsabilidades, limitacoes e referencias normativas.
4. Resumo das maquinas do cliente.
5. Uma pagina exclusiva para cada maquina.
6. Declaracao tecnica e assinaturas.

Cada pagina de maquina deve mostrar:

- numero/TAG;
- codigo de barras futuro;
- tipo de equipamento, marca e modelo;
- gas refrigerante;
- local instalado;
- carga termica em BTU;
- area climatizada em m2;
- ocupantes fixos e variaveis;
- atividades e periodicidade;
- controle das manutencoes;
- ocorrencias.

Campos sem dados devem aparecer como `Nao informado`.

### Alteracao aditiva de dados

O equipamento ja possui tipo, patrimonio/TAG, codigo de barras, marca, modelo, BTU, gas e local. Adicionar sem quebrar o fluxo atual:

- `area_climatizada_m2`;
- `ocupantes_fixo`;
- `ocupantes_variavel`.

### Empresa contratada

```text
Razao social: M. Lima Manutencoes Prediais e Industriais LTDA
Nome fantasia: AIRMOVEBR
CNPJ: 04.959.153/0001-11
Endereco: Avenida Paissandu, 526 - Maringa/PR - CEP 87050-130
Telefone: (43) 99100-0035
E-mail: airmovebr@gmail.com
```

### Engenheiro responsavel

```text
Nome: Andre Mendes dos Santos
Titulo: Engenheiro Mecanico
CREA/Carteira: PR-206737/D
Registro/Visto: 89389
RNP: 1721220267
CPF: deixar em branco
Telefone: deixar em branco
E-mail: deixar em branco
```

### Cliente 1: Celso Garcia Cid

```text
Razao social: Black Workout Academia LTDA
CNPJ: 37.774.269/0001-35
Endereco-base do PMOC: Rod. Celso Garcia Cid, 123 - Londrina/PR
Documento: PMOC20260617
Emissao: junho/2026
Renovacao: junho/2027
Total: 13 maquinas
```

| TAG corrigida | Local | Equipamento | Carga | Area | Ocupantes |
| --- | --- | --- | ---: | ---: | --- |
| AC1 | Cozinha | Split Agratto | 12.000 BTU | 45 m2 | 40/50 |
| AC2 | Mezanino | Piso teto | 60.000 BTU | 45 m2 | 40/50 |
| AC3-AC7 | Musculacao | Piso teto | 60.000 BTU cada | 45 m2 | 20/50 |
| AC8-AC10 | Musculacao | Piso teto Gree | 60.000 BTU cada | 45 m2 | 20/50 |
| AC11-AC12 | Musculacao | Split Gree | 24.000 BTU cada | 45 m2 | 20/50 |
| AC13 | Sala Nutricionista | Split Philco | 9.000 BTU | 45 m2 | 20/50 |

### Cliente 2: Mituo Morita

```text
Razao social: Black Workout Escola de Ginastica e Danca LTDA
CNPJ: 50.536.236/0001-15
Endereco: Rua Mituo Morita, 290 - Conjunto Habitacional Alexandre Urbanas - Londrina/PR - CEP 86037-570
Documento: PMOC20260618
Emissao: junho/2026
Renovacao: junho/2027
Total: 17 maquinas
```

| TAG corrigida | Local | Equipamento | Carga | Area | Ocupantes |
| --- | --- | --- | ---: | ---: | --- |
| AC1-AC2 | Musculacao | Cassete | 60.000 BTU cada | 45 m2 | 40/50 |
| AC3-AC12 | Musculacao | Piso teto | 60.000 BTU cada | 45 m2 | 20/50 |
| AC13 | Banheiro Feminino | Split Philco | 18.000 BTU | 45 m2 | 20/50 |
| AC14 | Banheiro Masculino | Split Philco | 18.000 BTU | 45 m2 | 20/50 |
| AC15 | Cozinha | Split Philco | 9.000 BTU | 45 m2 | 20/50 |
| AC16 | Administrativo | Split Philco | 9.000 BTU | 45 m2 | 20/50 |
| AC17 | Sala Nutricionista | Split Philco | 9.000 BTU | 45 m2 | 20/50 |

### Conferencias antes do cadastro

- Confirmar bairro e CEP da unidade Celso: o PMOC cita Sabara; a ART cita Gleba Fazenda Palhano e CEP 86057-350.
- Confirmar ART por cliente: os textos fornecidos citam `1720263699262` e `1720253586490` em trechos diferentes.
- Confirmar marca dos equipamentos descritos apenas como `Piso teto` ou `Cassete`.
- Modelo e gas refrigerante ainda nao foram informados.
- As TAGs repetidas `AC7` nos documentos devem ser corrigidas pela sequencia aprovada acima.

### Continuidade futura do app PMOC

Depois das fases basicas da OS, concluir o app tecnico para executar manutencoes PMOC:

- selecionar ou ler a maquina por codigo de barras;
- trabalhar sempre dentro do cliente e equipamento corretos;
- preencher checklist estruturado por periodicidade;
- registrar fotos, ocorrencias, tecnico, data e visto;
- operar offline e sincronizar sem duplicar manutencoes;
- alimentar o historico usado pelo PDF PMOC de cada maquina.

## Pendencias de codigo

Meta: manter arquivos proprios com no maximo 500 linhas. Lockfiles, codigo gerado e dependencias externas nao entram nessa regra.

### 1. Dividir o servico central de relatorios

- Arquivo: `apps/backend/src/modules/admin/services/admin-relatorio-tecnico-core.service.ts`
- Tamanho atual: 2.045 linhas.
- Extrair geracao de PDF, montagem de previa PMOC, calculos e formatacao para servicos internos separados.
- Manter o servico principal apenas como orquestrador.

### 2. Dividir o servico de ordens de servico

- Arquivo: `apps/backend/src/modules/ordens-servico/ordens-servico.service.ts`
- Tamanho atual: 732 linhas.
- Separar validacoes, evidencias, checklist, transicoes de status e finalizacao.
- Preservar as regras atuais e a imutabilidade de OS concluida.

### 3. Reduzir o HTML do painel administrativo

- Arquivo: `apps/admin/index.html`
- Tamanho atual: 1.006 linhas.
- Extrair blocos repetidos ou templates carregados pelos modulos JavaScript.
- Nao alterar classes ou contratos do frontend sem necessidade.
- Fazer validacao visual local apos a divisao.

### 4. Dividir o CSS da landing page

- Arquivo: `apps/landing/css/style.css`
- Tamanho atual: 1.060 linhas.
- Separar por areas da pagina, mantendo a aparencia e o comportamento responsivo.

### 5. Dividir o seed do banco

- Arquivo: `apps/backend/prisma/seed.ts`
- Tamanho atual: 620 linhas.
- Separar dados e rotinas por dominio sem alterar o resultado do seed.

## Ordem recomendada

1. `admin-relatorio-tecnico-core.service.ts`
2. `ordens-servico.service.ts`
3. `apps/admin/index.html` e validacao visual
4. `apps/landing/css/style.css`
5. `apps/backend/prisma/seed.ts`

Cada etapa deve terminar com as validacoes aplicaveis:

```text
npm.cmd run frontend:test
npm.cmd run backend:test
npm.cmd run backend:build
npm.cmd run backend:lint
```

## Producao

- Dominio: `airmovebr.com.br`
- IP esperado: `191.252.226.11`
- Deploy: `/opt/airmovebr/repo`
- DNS configurado no Registro.br em 20/06/2026 e aguardando propagacao.
- Depois da propagacao, retestar site, admin, API, HTTPS e formulario publico pelo dominio.

Validacao provisoria por IP:

```text
http://191.252.226.11
http://191.252.226.11/admin
http://191.252.226.11/api/v1/health
```

## Seguranca

- Nao commitar `.env`, `.env.local` ou `.env.production`.
- Nao expor senhas, tokens, segredos JWT, chaves privadas ou banco.
- Manter o PostgreSQL de producao sem porta publica.
- Nao versionar PDFs assinados de `apps/backend/storage/`.
