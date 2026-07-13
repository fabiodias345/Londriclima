# Memoria Clima do Brasil / AIRMOVEBR

Atualizado em: 13/07/2026

## Contexto

- Marca atual: Clima do Brasil.
- Cliente piloto e infraestrutura legada: AIRMOVEBR, Londrina/PR.
- Dominio: `airmovebr.com.br`.
- Repositorio: `https://github.com/fabiodias345/Londriclima.git`.
- Workspace local atual: `E:\develop\Londriclima`.
- Produto: plataforma operacional para climatizacao, O.S., PMOC, frota e relatorios.
- Prioridade atual: validar os apps tecnico e admin na operacao real antes de evoluir SaaS.

## Stack

- Backend: NestJS, TypeScript, Prisma, PostgreSQL.
- Admin: HTML, CSS, JavaScript, Leaflet.
- Landing: HTML, CSS, JavaScript.
- Mobile: Flutter Android.
- Apps Flutter separados: tecnico em `apps/mobile` e admin em `apps/admin_mobile`.
- Infra: Docker Compose local/producao em VM Locaweb.
- Testes: Flutter test/analyze, node:test, Nest Testing e contratos frontend.

## Fluxo operacional

```text
site -> pre-chamado -> admin -> O.S. -> app tecnico -> checklist/fotos/GPS/assinatura -> relatorios/PMOC
```

## Decisoes ativas

- Marca visivel: Clima do Brasil.
- O app tecnico nao escolhe periodicidade; a O.S. traz `checklist_tipo`.
- O backend monta o checklist flat e o app apenas renderiza/salva.
- Uma O.S. pode atender varias maquinas do mesmo cliente/local.
- A O.S. so deve concluir depois de todos os equipamentos pendentes serem executados.
- GPS e por evento operacional, nao rastreamento continuo do tecnico.
- Frota deve usar rastreador/IMEI dedicado, nao celular do tecnico.
- PMOC nao pode misturar maquinas, O.S. ou fotos entre clientes.

## Estado atual do app tecnico

- Login real via API.
- Lista operacional de O.S.
- Filtros e detalhe.
- Inicio de atendimento com GPS.
- Selecao/cadastro de maquina.
- Cadastro obrigatorio da maquina com justificativa para dado impossivel.
- Checklist preventivo definido pelo backend.
- Checklist corretivo simples para O.S. corretiva.
- Fotos dentro do checklist.
- Salvamento de checklist por maquina.
- Finalizacao com nome, assinatura, GPS e data/hora.
- Fila offline para checklist/fotos/finalizacao.
- Scanner QR/codigo de barras.
- Abastecimento de frota.
- UX recente:
  - layout mais moderno;
  - pendencias em azul claro;
  - checklist por grupos;
  - progresso e proxima pendencia;
  - botao fixo para salvar checklist;
  - maquinas separadas por pendentes/prontas/concluidas.

## Checklist preventivo

- Fonte de referencia: `checklist.md`.
- Composicao:
  - Mensal = itens mensais.
  - Trimestral = mensal + extras trimestrais.
  - Semestral = mensal + trimestral + extras semestrais.
  - Anual = mensal + trimestral + semestral + extras anuais.
- Nao duplicar desligamento, seguranca, fotos equivalentes, medicoes ou finalizacao.
- Semestral e anual precisam da foto extra da condensadora limpa.

## Painel admin

- Admin gerencia clientes, equipamentos, agenda/O.S., recorrencias, frota, relatorios e PMOC.
- O.S. precisa permitir corrigir erro operacional com editar/cancelar/apagar conforme regra aprovada.
- Planos preventivos precisam manter editar e apagar.
- O painel deve ser usado para gerar O.S. real e validar o app no campo.
- Recorrencia em producao ja gera O.S. automaticamente pelo scheduler do backend quando `proxima_execucao` vence; em 30/06/2026 gerou O.S. para Luri/Paulo e avancou o plano para 30/07/2026.
- Menu `Dashboard` do admin foi removido; a tela de O.S. virou a visao operacional principal.

## App admin mobile

- Aplicativo separado do app tecnico.
- Somente usuario com `role=admin` pode acessar.
- Fases 1 a 4 concluidas:
  - login e dashboard;
  - consultas reais dos modulos administrativos;
  - criar/reprogramar O.S. e tratar pre-chamados;
  - reenvio de assinatura PMOC;
  - busca, filtros e layout compacto;
  - abertura autenticada de PDFs;
  - frota somente para consulta.
- Validacao estatica atual: `dart analyze lib test` sem problemas.
- `flutter test --no-pub` ainda trava sem saida neste ambiente.
- Notificacoes dependem de templates aprovados, webhook e validacao em O.S. real.
- APK admin fica para o final.

## WhatsApp Cloud API

- Numero oficial configurado e validado localmente e em producao: `+55 43 3067-3793`.
- Segredos ficam fora do Git em `whats.env`.
- Token permanente novo validado contra a Graph API.
- Envio de texto livre funciona quando o contato abriu janela de atendimento.
- Mensagens iniciadas pela empresa dependem de template aprovado pela Meta.
- Template `boas_vindas_airmovebr` criado e pendente de aprovacao.
- Backend em producao tem integracao inicial para processar automacoes `enviar_whatsapp` na finalizacao de O.S.
- Falta configurar webhook para receber status `sent`, `delivered`, `read` e `failed`.

## PMOC e relatorios

- PMOC atual existe no backend com previa, PDF, assinatura do engenheiro e envio final.
- Componentes PDF reutilizaveis foram extraidos para cabecalho, cartoes, checklist, fotos e assinaturas.
- Relatorio avulso/corretivo usa o novo padrao visual e separa dados nao-PMOC de PMOC.
- PDF PMOC recebeu o padrao visual preservando ART, engenheiro, periodicidade e dados obrigatorios.
- PDF avulso preserva acentos, cedilha e textos em portugues com WinAnsiEncoding.
- Relatorio nao-PMOC nao deve puxar dados de PMOC nem engenheiro.
- Relatorio Camara Fria foi implementado e validado com PDF simulado.

## Infra

- Producao: Locaweb Cloud.
- IP: `191.252.226.11`.
- Repo na VM: `/opt/airmovebr/repo`.
- Deploy WhatsApp validado e promovido por `main`.
- Banco de producao sem migrations pendentes no ultimo deploy.
- URLs:
  - `https://airmovebr.com.br/`
  - `https://admin.airmovebr.com.br/`
  - `https://api.airmovebr.com.br/api/v1/health`

## Diagnostico rapido

- Se o login funciona mas o painel abre sem clientes, maquinas ou dados reais, testar primeiro o banco de dados/producao:
  - validar `/api/v1/admin/clientes` com token do usuario logado;
  - contar `clientes`, `equipamentos` e `usuarios` no Postgres da Locaweb;
  - conferir se o `empresa_id` do usuario logado e o mesmo `empresa_id` dos clientes/equipamentos.
- Caso `admin` entre em empresa vazia, corrigir o vinculo do usuario antes de investigar frontend, DNS ou cache.
- Se uma O.S. recorrente nao aparecer no APK, conferir primeiro na Locaweb:
  - logs do backend com `AdminRecorrenciaSchedulerService`;
  - tabela `ordens_servico` por `criada_em`/`agendada_para`;
  - `tecnico_id` da O.S. e login do tecnico no app;
  - refresh/logout-login no APK antes de culpar geracao da O.S.

## Pendencias futuras

1. Validar checklist do app tecnico no celular real.
2. Ajustar regra final de fotos por periodicidade.
3. Melhorar finalizacao da O.S. no app tecnico.
4. Finalizar WhatsApp com templates aprovados, webhook e teste de O.S. real.
5. Testar o app admin completo no aparelho real.
6. Gerar APK tecnico/admin quando aprovados.
7. Refazer PDF avulso visual com fotos e assinatura reais.
8. Depois aplicar o padrao visual ao PMOC.
9. Conferir O.S. real e PDFs reais em producao.
10. Validar no painel edicao, cancelamento e exclusao de O.S. gerada errada.
11. Conferir a primeira execucao do snapshot semanal da Locaweb.
12. Confirmar recebimento real do alerta de backup por e-mail.

## Comandos uteis

```text
cd E:\develop\Londriclima\apps\mobile
flutter run --dart-define=MOBILE_API_BASE_URL=http://10.91.93.11:3000
flutter run --dart-define=MOBILE_API_BASE_URL=https://api.airmovebr.com.br
flutter test
flutter analyze
flutter build apk --debug --dart-define=MOBILE_API_BASE_URL=https://api.airmovebr.com.br
```

```text
cd E:\develop\Londriclima\apps\admin_mobile
flutter run --dart-define=ADMIN_API_BASE_URL=https://api.airmovebr.com.br
dart analyze lib test
```

```text
npm.cmd run backend:build
npm.cmd run backend:test
npm.cmd run frontend:test
```
