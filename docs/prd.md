# PRD - AIRMOVEBR Digital

Versao: 1.5.0  
Atualizado em: 21/06/2026  
Cliente piloto: AIRMOVEBR - Londrina/PR

## Visao

Plataforma de Field Service Management para manutencao, instalacao e PMOC de ar-condicionado.

Fluxo principal:

```text
site -> pre-chamado -> admin -> OS -> tecnico -> evidencias/checklist/GPS -> relatorios/PMOC
```

O produto deve atender primeiro a operacao real da AIRMOVEBR e evoluir depois para SaaS multiempresa.

## Modulos

### Site publico

- Captar pre-chamados.
- Enviar solicitacoes para o backend.
- Operar em `https://airmovebr.com.br/`.

### Painel admin

- Gerenciar clientes, equipamentos, agenda, OS, frota, relatorios e PMOC.
- Operar em `https://admin.airmovebr.com.br/`.
- Criar/aprovar pre-chamados e acompanhar execucao.

### Backend

- API NestJS com JWT, Prisma e PostgreSQL.
- Operar localmente em `http://localhost:3000/api/v1`.
- Operar em producao em `https://api.airmovebr.com.br/api/v1`.
- Manter regras de negocio no servidor, mesmo quando o app tiver validacoes locais.

### App tecnico Android

Estado atual: em desenvolvimento por fases.

Concluido:

1. Login fake local.
2. Login real por API.
3. Dashboard de OS do tecnico.
4. Filtros por status/data.
5. Detalhe da OS.
6. Listagem de varias maquinas no mesmo atendimento.
7. Inicio de servico com GPS.
8. Chegada ao cliente com GPS.
9. Recebimento de checklist flat definido pelo backend.
10. Selecao de maquina antes do checklist.
11. Renderizacao do checklist por tipo de campo.
12. Salvamento do checklist preenchido por maquina.

Pendente:

1. Fotos dentro dos itens do checklist.
2. Assinatura do cliente.
3. Finalizacao da OS.
4. Offline/sync.
5. Codigo de barras/QR por equipamento.
6. APK release.

## Stack Real Atual

| Camada | Tecnologia |
| --- | --- |
| Backend | Node.js, NestJS, TypeScript |
| Banco | PostgreSQL, Prisma |
| Admin | HTML, CSS, JavaScript, Leaflet |
| Landing | HTML, CSS, JavaScript |
| Mobile | Flutter Android |
| Auth | JWT |
| Infra | Docker local e VM Locaweb Cloud |
| Testes | Node test, Nest Testing, ESLint, Flutter test |

Tecnologias antigas citadas em documentos anteriores, como FastAPI, React/Tailwind, Drift e Supabase, nao representam o estado atual implementado. Podem voltar como decisao futura, mas nao devem ser tratadas como arquitetura ativa.

## Estado da OS

```text
pre_chamado
  +-- rejeitar -> rejeitada
  +-- aprovar  -> aberta
                 +-- iniciar_atendimento -> em_atendimento
                 +-- cancelar        -> cancelada
                 +-- finalizar       -> concluida
```

Regras:

- OS concluida nao deve ser reaberta.
- GPS e capturado por evento, nao por rastreamento continuo.
- Celular do tecnico nao deve ser usado como rastreador de frota.
- Para rastreamento continuo de veiculo, usar hardware dedicado.
- Antes de finalizar, a API deve validar evidencias, checklist, assinatura e GPS final.

## Fluxo Mobile Alvo

```text
1. Login
2. Listar minhas OS
3. Abrir detalhe da OS
4. Iniciar atendimento com GPS
5. Selecionar equipamento existente ou cadastrar novo
6. Completar cadastro obrigatorio da maquina ou justificar dado impossivel
7. Foto antes
8. Checklist por periodicidade
9. Observacoes e ocorrencias
10. Foto depois
11. Assinatura do cliente
12. Finalizar OS com GPS
13. Sincronizar pendencias
```

## PMOC

Requisitos:

- PMOC sempre separado por cliente e endereco.
- Nao misturar maquinas de clientes diferentes.
- Cada equipamento deve ter historico proprio.
- O tecnico nao escolhe a periodicidade do checklist no app; a OS deve trazer o `checklist_tipo` definido pelo admin ou pela recorrencia.
- O backend deve enviar o checklist flat ja expandido para o mobile, incluindo herancas entre mensal, trimestral, semestral e anual.
- O PDF profissional deve listar maquinas, atividades, periodicidade, registros e assinaturas.
- O app deve alimentar o historico PMOC com checklist, fotos e ocorrencias por equipamento.

Estado atual:

- Previa PMOC no backend.
- PDF PMOC atual no backend.
- Fluxo de assinatura do engenheiro.
- Envio final ao cliente com PDF assinado.
- Novo PDF profissional por maquina ainda pendente.

## Escopo MVP

Dentro do MVP:

- Site publico.
- Admin.
- Backend.
- Login tecnico.
- OS no app.
- GPS por eventos.
- Fotos e checklist.
- Assinatura do cliente.
- PDF/relatorio.
- PMOC basico.

Fora do MVP:

- iOS.
- NF-e/NFS-e.
- ERP externo.
- IA de diagnostico.
- Banco aberto publicamente.
- Rastreamento continuo pelo celular.
- Multiempresa comercial ativa com varios clientes SaaS.

## Criterios de Aceite Mobile

- Tecnico loga com conta real.
- Tecnico ve somente OS vinculadas a ele/equipe.
- Uma OS com varias maquinas mostra todas as maquinas.
- Iniciar atendimento grava GPS e muda status no backend.
- Tecnico seleciona/cadastra maquina e completa dados obrigatorios antes do checklist.
- Checklist nao permite finalizar incompleto.
- Fotos antes/depois sao obrigatorias.
- Finalizacao exige assinatura e GPS final.
- Se ficar sem internet, app guarda pendencias e sincroniza depois.

## Comandos de Validacao

Backend:

```text
npm.cmd run backend:build
npm.cmd run backend:test
npm.cmd run backend:lint
```

Mobile:

```text
cd apps/mobile
flutter test
flutter analyze
flutter build apk --debug
```

## Decisoes Operacionais

- Commit, push e deploy sao manuais pelo usuario.
- Segredos nao devem ir para Git.
- Arquivos proprios devem ficar preferencialmente abaixo de 500 linhas.
- A maquina local e o ambiente principal para testar o APK nesta etapa.
- Producao esta online, mas so deve receber o APK depois do fluxo local ficar bom.
