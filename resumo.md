# Resumo AIRMOVEBR

Atualizado em: 20/06/2026

## Estado operacional

- Workspace: `C:\develop\Londriclima`
- Branch atual: `dev`
- Commit atual: `75a4b12`
- `dev`, `main`, `origin/dev` e `origin/main` apontam para o mesmo commit.
- Arvore de trabalho limpa antes desta atualizacao.
- Commit, push e deploy sao feitos manualmente pelo usuario.

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

### Continuidade futura do app

Depois do PDF e dos cadastros, concluir o app tecnico para executar manutencoes:

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
