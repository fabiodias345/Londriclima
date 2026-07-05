# PRD - Clima do Brasil Digital

Versao: 1.7.0
Atualizado em: 04/07/2026
Cliente piloto: AIRMOVEBR - Londrina/PR

## Visao

Plataforma Clima do Brasil para manutencao, instalacao, frota, relatorios e PMOC de ar-condicionado. Os dominios e parte da infraestrutura ainda usam o nome AIRMOVEBR.

Fluxo principal:

```text
site -> pre-chamado -> admin -> O.S. -> tecnico -> evidencias/checklist/GPS/assinatura -> relatorios/PMOC
```

O produto deve resolver primeiro a operacao real da AIRMOVEBR e depois evoluir para SaaS multiempresa.

## Modulos

### Site publico

- Captar pre-chamados.
- Enviar solicitacoes para o backend.
- Operar em `https://airmovebr.com.br/`.

### Painel admin

- Gerenciar clientes, equipamentos, agenda, O.S., recorrencias, frota, relatorios e PMOC.
- Operar em `https://admin.airmovebr.com.br/`.
- Criar O.S. preventiva/corretiva.
- Enviar O.S. para campo.
- Corrigir erro operacional com editar/cancelar/apagar conforme regra aprovada.

### Backend

- API NestJS com JWT, Prisma e PostgreSQL.
- Operar localmente em `http://localhost:3000/api/v1`.
- Operar em producao em `https://api.airmovebr.com.br/api/v1`.
- Manter regras de negocio no servidor, mesmo quando o app validar localmente.
- Montar checklist flat por tipo de O.S. e periodicidade.

### App tecnico Android

Estado atual: fluxo operacional em evolucao visual e funcional.

Ja implementado:

1. Login fake local e login real por API.
2. Dashboard de O.S.
3. Filtros por status/data.
4. Detalhe da O.S.
5. Listagem de varias maquinas no mesmo atendimento.
6. Inicio de atendimento com GPS.
7. Selecao/cadastro de maquina antes do checklist.
8. Cadastro obrigatorio da maquina com justificativa para dado impossivel.
9. Checklist flat vindo do backend.
10. Checklist preventivo por periodicidade.
11. Checklist corretivo simples.
12. Fotos dentro do checklist.
13. Salvamento de checklist por maquina.
14. Finalizacao com nome, assinatura, GPS e data/hora.
15. Fila offline para checklist/fotos/finalizacao.
16. Scanner QR/codigo de barras.
17. Registro de abastecimento.
18. UX de campo com contraste melhor, pendencias em azul claro, grupos de checklist, progresso e botao fixo.

### App admin Android

Estado atual: fases 1 a 4 implementadas e codigo alinhado no GitHub e na VM de producao.

Ja implementado:

1. Login real pela API com acesso exclusivo para `role=admin`.
2. Dashboard separado do app tecnico.
3. Consulta real de O.S., agenda, clientes, PMOC, frota, relatorios, tecnicos e pendencias.
4. Criacao e reprogramacao de O.S.
5. Aprovacao e rejeicao de pre-chamado.
6. Reenvio de assinatura PMOC.
7. Busca e filtros locais.
8. Layout compacto para celular pequeno.
9. Abertura autenticada de PDF PMOC e relatorio avulso.
10. Consulta de detalhes da frota sem edicao.

Pendente no app admin:

1. Definir telefone e integracao Meta para notificacoes.
2. Validar o fluxo completo no aparelho real.
3. Gerar e distribuir o APK admin somente no final.

Pendente no app tecnico:

1. Validar no aparelho real sob sol.
2. Ajustar regra final de fotos por periodicidade.
3. Melhorar finalizacao da O.S. no app.
4. Gerar APK novo aprovado.
5. Publicar em producao.

## Stack ativa

| Camada | Tecnologia |
| --- | --- |
| Backend | Node.js, NestJS, TypeScript |
| Banco | PostgreSQL, Prisma |
| Admin | HTML, CSS, JavaScript, Leaflet |
| Landing | HTML, CSS, JavaScript |
| Mobile | Flutter Android, com apps tecnico e admin separados |
| Auth | JWT |
| Infra | Docker local e VM Locaweb Cloud |
| Testes | Node test, Nest Testing, ESLint, Flutter test |

Tecnologias antigas citadas em documentos anteriores, como FastAPI, React/Tailwind, Drift e Supabase, nao representam a arquitetura ativa.

## Estado da O.S.

```text
pre_chamado
  +-- rejeitar -> rejeitada
  +-- aprovar  -> aberta
                 +-- iniciar_atendimento -> em_atendimento
                 +-- cancelar            -> cancelada
                 +-- finalizar           -> concluida
```

Regras:

- O.S. concluida nao deve ser reaberta.
- GPS e capturado por evento, nao por rastreamento continuo.
- Celular do tecnico nao deve ser usado como rastreador de frota.
- Para rastreamento continuo de veiculo, usar hardware dedicado.
- Antes de finalizar, a API deve validar checklist, fotos exigidas, assinatura e GPS final.

## Fluxo mobile alvo

```text
1. Login
2. Listar minhas O.S.
3. Abrir detalhe da O.S.
4. Iniciar atendimento com GPS
5. Selecionar equipamento existente ou cadastrar novo
6. Completar cadastro obrigatorio da maquina ou justificar dado impossivel
7. Preencher checklist por periodicidade/tipo de servico
8. Registrar fotos exigidas pelo checklist
9. Salvar checklist da maquina
10. Repetir para todas as maquinas da O.S.
11. Assinar com responsavel
12. Finalizar O.S. com GPS
13. Sincronizar pendencias quando necessario
```

## Checklist preventivo

- Fonte de referencia: `checklist.md`.
- O tecnico nao escolhe periodicidade no app.
- A O.S. deve trazer `checklist_tipo` definido pelo admin ou pela recorrencia.
- O backend deve enviar checklist flat ja expandido:
  - mensal;
  - trimestral = mensal + trimestral;
  - semestral = mensal + trimestral + semestral;
  - anual = mensal + trimestral + semestral + anual.
- Nao duplicar pedidos entre periodicidades.
- Medicoes devem receber valores reais.
- Pendencias devem ficar visiveis em azul claro.

## PMOC

Requisitos:

- PMOC sempre separado por cliente e endereco.
- Nao misturar maquinas de clientes diferentes.
- Cada equipamento deve ter historico proprio.
- O app deve alimentar o historico PMOC com checklist, fotos e ocorrencias por equipamento.
- PDF profissional deve listar maquinas, atividades, periodicidade, registros e assinaturas.

Estado:

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
- O.S. no app.
- GPS por eventos.
- Fotos e checklist.
- Assinatura do responsavel.
- PDF/relatorio.
- PMOC basico.
- Frota basica com veiculos e abastecimentos.

Fora do MVP:

- iOS.
- NF-e/NFS-e.
- ERP externo.
- IA de diagnostico.
- Banco aberto publicamente.
- Rastreamento continuo pelo celular.
- Multiempresa comercial ativa com varios clientes SaaS.

## Criterios de aceite mobile

- Tecnico loga com conta real.
- Tecnico ve somente O.S. vinculadas a ele/equipe.
- Uma O.S. com varias maquinas mostra todas as maquinas.
- Iniciar atendimento grava GPS e muda status no backend.
- Tecnico seleciona/cadastra maquina e completa dados obrigatorios antes do checklist.
- Checklist nao permite salvar incompleto.
- Fotos exigidas pelo checklist sao obrigatorias.
- Finalizacao exige assinatura e GPS final.
- Se ficar sem internet, app guarda pendencias e sincroniza depois.
- Interface deve ser legivel em campo e sob sol.

## Comandos de validacao

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

## Decisoes operacionais

- Commit, push e deploy so podem ser executados quando solicitados explicitamente.
- Segredos nao devem ir para Git.
- Arquivos proprios devem ficar preferencialmente abaixo de 500 linhas.
- A maquina local e o ambiente principal para testar o APK nesta etapa.
- Producao esta online, mas so deve receber mudancas depois do fluxo local ficar bom.
