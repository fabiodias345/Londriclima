# Resumo AIRMOVEBR

Atualizado em: 19/06/2026

## Estado Atual

- Workspace: `C:\develop\LondriClima`
- Branch atual: `main`
- Commit atual em `main`: `2bbe740 feat: adiciona planos recorrentes`
- Commit atual em `dev`: `595b23a Adiciona app mobile AIRMOVEBR`
- Branch `main` esta a frente de `dev` com agenda operacional, equipes tecnicas flexiveis e planos recorrentes.
- Branch `seg`: ficou no commit anterior `afdcab9` e o remoto `origin/seg` nao existe mais.
- Produto: site, admin, API e app Android inicial da AIRMOVEBR para pre-chamado, OS, tecnico, frota, PMOC e automacoes.
- App mobile Flutter Android criado em `apps/mobile`.

## Acessos Locais

```text
Backend health:  http://127.0.0.1:3000/api/v1/health
Admin:           http://127.0.0.1:5174/admin/
Landing:         http://127.0.0.1:5174/landing/
Assinatura PMOC: http://127.0.0.1:5174/landing/assinatura-pmoc.html?token=:token
Adminer:         http://127.0.0.1:8080
Login seed API:  tecnico@airmovebr.local / 123456
Login app local: teste / 123456
```

## Feito

- PMOC com solicitacao de assinatura via Assinafy.
- Sincronizacao/webhook Assinafy para fechar relatorio quando o documento fica certificado.
- Envio final do PMOC assinado para o cliente por SMTP.
- Copia interna do e-mail final para `PMOC_INTERNAL_COPY_EMAIL`, configurado como `airmovebr2@gmail.com`.
- Retry de automacoes SMTP:
  - falha temporaria volta para `pendente`;
  - falha definitiva so ocorre no limite de tentativas;
  - automacao so conclui com comprovante SMTP.
- Limpeza de automacao antiga falhada sem PDF.
- Arquivamento de PDF assinado no Google Drive:
  - variaveis criadas em `.env.example` e `.env.production.example`;
  - service account configurada em `.env.local`;
  - campo `pdf_drive_url` criado no banco.
- Drive virou best effort:
  - se o Drive falhar, assinatura e e-mail continuam;
  - erro fica registrado no log.
- Corrigido controle mensal PMOC:
  - vermelho: falta solicitar;
  - amarelo: aguardando assinatura;
  - verde: enviado ao cliente.
- Corrigido caso de multiplos relatorios no mesmo mes:
  - relatorio assinado tem prioridade sobre pendente para mostrar o status mensal.
- Excecao de teste para `Cris Magnani`:
  - mesmo com PMOC assinado ou pendente, o botao continua liberado para solicitar nova assinatura.
- `apps/backend/storage/` ignorado no Git para nao commitar PDFs locais.
- Landing nova e ajustes administrativos enviados para `dev` e depois alinhados em `main`.
- App mobile Android inicial criado em `apps/mobile`:
  - login local de teste `teste / 123456`;
  - logo nova da AIRMOVEBR mantida apenas na tela de login;
  - dashboard sem logo, com atalhos `Cliente` e `Carro`;
  - APK rodou no celular depois da troca do cabo USB.
- Commit `595b23a Adiciona app mobile AIRMOVEBR` enviado para GitHub em `dev` e `main`.
- Agenda operacional adicionada no admin:
  - calendario mensal;
  - lista de pendencias sem horario/equipe;
  - criacao e edicao de OS;
  - despacho por equipe ou tecnico.
- Equipes tecnicas flexiveis adicionadas:
  - tecnico/auxiliar;
  - membros ilimitados por equipe;
  - equipe vinculada a clientes e OS.
- Planos recorrentes adicionados:
  - cadastro de rotina por cliente/equipamento;
  - frequencias mensal, bimestral, trimestral, semestral e anual;
  - geracao manual de OS recorrente;
  - avanco automatico da proxima execucao.
- Commit atual de producao desejado: `2bbe740 feat: adiciona planos recorrentes`.

## Validacoes

Ultima rodada ampla local antes dos commits PMOC/landing:

```text
npm.cmd run backend:test  -> 88/88 OK
npm.cmd run frontend:test -> 8/8 OK
npm.cmd run backend:build -> OK
npm.cmd run backend:lint  -> OK
```

Validacao mobile:

```text
flutter analyze -> No issues found
flutter run     -> APK buildou, instalou e rodou no celular apos trocar o cabo USB
flutter test    -> nao concluido; runner local travou e foi interrompido
```

Health local depois do restart:

```text
http://localhost:3000/api/v1/health -> status ok
```

Validacao da Cris pela API:

```json
{
  "assinatura_status": "assinado",
  "assinatura_assinafy": "certificated",
  "junho_status": "assinado",
  "junho_assinafy": "certificated"
}
```

Validacao local em 18/06/2026 no commit `2bbe740`:

```text
npm.cmd run frontend:test -> 11/11 OK
npm.cmd run backend:test  -> 108/108 OK
npm.cmd run backend:build -> OK
npm.cmd run backend:lint  -> OK
```

## Bloqueio Atual

O Google Drive ainda nao salvou na pasta porque a API respondeu:

```text
Drive 404: File not found: 1ar6WM_APajSPb85U1ffsc4uHMVSrw9Ih
```

Diagnostico: a pasta existe para o usuario, mas a service account ainda nao tem acesso.

Conta que precisa ser compartilhada na pasta do Drive:

```text
drive-integracao@automacao-499404.iam.gserviceaccount.com
```

Permissao necessaria: `Editor`.

Pasta alvo:

```text
https://drive.google.com/drive/folders/1ar6WM_APajSPb85U1ffsc4uHMVSrw9Ih
```

## Producao

- Dominio: `airmovebr.com.br`
- IP esperado: `191.252.226.11`
- VM: Locaweb Cloud Ubuntu 24.04.3 LTS
- Deploy: `/opt/airmovebr/repo`
- Usuario operacional: `airmovebr`
- Backend/PostgreSQL ja tinham sido validados internamente em Docker.
- O dominio `airmovebr.com.br` ainda aponta para outro IP/site antigo.
- Nota 2026-06-16: o cliente ainda nao passou o acesso/gestao do registro do dominio.
- Enquanto o dominio nao apontar para `191.252.226.11`, testes pelo dominio podem falhar mesmo com a VM e a API funcionando por IP. O formulario de pre-chamado foi validado por IP, mas deve ser retestado pelo dominio depois do apontamento DNS.
- Para nao derrubar o site antigo antes da aprovacao, o primeiro teste deve ser por IP:
  - `http://191.252.226.11`
  - `http://191.252.226.11/admin`
  - `http://191.252.226.11/api/v1/health`
- Bloqueador atual: chave SSH da VM esta salva em outra maquina. Tentativas locais em `airmovebr@191.252.226.11` e `root@191.252.226.11` retornaram `Permission denied (publickey,password)`.
- Nao trocar a chave agora; subir a partir da outra maquina que ja possui acesso.

Registros DNS desejados:

```text
airmovebr.com.br       -> 191.252.226.11
admin.airmovebr.com.br -> 191.252.226.11
api.airmovebr.com.br   -> 191.252.226.11
```

Para homologar por IP antes de mexer no Registro.br:

```text
cd /opt/airmovebr/repo
git fetch origin
git checkout main
git pull origin main
docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml up -d --build
docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml exec backend npx prisma migrate deploy
docker ps
```

Validar:

```text
http://191.252.226.11
http://191.252.226.11/admin
http://191.252.226.11/api/v1/health
```

Se o Caddy estiver configurado apenas para `airmovebr.com.br`, ajustar o proxy para aceitar o IP temporariamente antes da homologacao.

Depois da aprovacao, entrar no Registro.br e apontar:

```text
airmovebr.com.br       -> 191.252.226.11
www.airmovebr.com.br   -> airmovebr.com.br
admin.airmovebr.com.br -> 191.252.226.11
api.airmovebr.com.br   -> 191.252.226.11
```

Depois que o DNS propagar, retestar obrigatoriamente:

```text
https://airmovebr.com.br
https://airmovebr.com.br/api/v1/health
https://airmovebr.com.br/admin
Formulario publico de pre-chamado pelo dominio
Painel admin > Pre-chamados recebidos
```

## Proximos Passos

## Plano 01: Refatoracao Incremental Segura

Objetivo: reduzir arquivos gigantes, diminuir consumo de token e melhorar manutencao sem reescrever o sistema.

Regra principal: PMOC fica por ultimo. Nada de mexer no fluxo PMOC enquanto agenda, recorrencia, frota, clientes e usuarios nao estiverem estabilizados.

### Fase 0: Rede de Seguranca

- [x] Rodar testes atuais antes de extrair codigo.
- [x] Criar smoke test de fachada para garantir que `AdminService` delega agenda/recorrencias.
- [ ] Ampliar smoke tests quando cada novo dominio for extraido.
- [ ] Nao criar feature nova dentro de `admin.service.ts`.
- [ ] Nao aumentar arquivos acima de 500 linhas sem justificativa.

### Fase 1: Agenda + Planos Recorrentes

- [x] Criar `apps/backend/src/modules/admin/services/admin-agenda.service.ts`.
- [x] Criar `apps/backend/src/modules/admin/services/admin-recorrencia.service.ts`.
- [x] Mover agenda e planos recorrentes sem mudar regra de negocio.
- [x] Manter `AdminService` como fachada/delegacao.
- [x] Registrar novo service em `AdminModule`.
- [x] Validar com `backend:test`.
- [x] Validar com `frontend:test`, `backend:build` e `backend:lint`.

Escopo movido:

- `listarAgenda`
- `criarOrdemAgenda`
- `reprogramarOrdemAgenda`
- `listarPlanosRecorrencia`
- `criarPlanoRecorrencia`
- `atualizarPlanoRecorrencia`
- `gerarOrdemPlanoRecorrencia`
- helpers internos de agenda/recorrencia

Resultado da Fase 1:

```text
admin.service.ts              -> 3381 linhas
admin-agenda.service.ts       -> 317 linhas
admin-recorrencia.service.ts  -> 376 linhas
```

### Fase 2: Frota

- [x] Criar `apps/backend/src/modules/admin/services/admin-frota.service.ts`.
- [x] Mover localizacoes, abastecimentos e relatorios de frota.
- [x] `AdminService` delega.
- [x] Rodar testes antes e depois.

Resultado da Fase 2:

```text
admin.service.ts        -> 3156 linhas
admin-frota.service.ts  -> 268 linhas
```

### Fase 3: Clientes + Equipamentos

- [x] Criar `admin-clientes.service.ts`.
- [x] Criar `admin-equipamentos.service.ts`.
- [x] Mover CRUD de clientes, equipamentos e links publicos.
- [x] `AdminService` delega.
- [x] Rodar testes antes e depois.

Resultado local da Fase 3:

```text
admin.service.ts             -> 2534 linhas
admin-clientes.service.ts    -> 401 linhas
admin-equipamentos.service.ts -> 311 linhas
```

### Fase 4: Tecnicos + Equipes + Engenheiros

- [x] Criar `admin-tecnicos.service.ts`.
- [x] Criar `admin-equipes.service.ts`.
- [x] Criar `admin-engenheiros.service.ts`.
- [x] Mover cadastro, edicao, exclusao e validacoes desses dominios.
- [x] `AdminService` delega.
- [x] Rodar testes antes e depois.

Resultado local da Fase 4:

```text
admin.service.ts              -> 2059 linhas
admin-tecnicos.service.ts     -> 143 linhas
admin-equipes.service.ts      -> 267 linhas
admin-engenheiros.service.ts  -> 160 linhas
```

Observacao: Fase 4 ficou apenas local, junto com a Fase 3 ainda sem commit/deploy. Validado com backend:test, frontend:test, backend:build e backend:lint.

### Fase 5: Pre-chamados

- [x] Criar `admin-pre-chamados.service.ts`.
- [x] Mover listagem, aprovacao, rejeicao e conversao para OS.
- [x] `AdminService` delega.
- [x] Rodar testes antes e depois.

Resultado local da Fase 5:

```text
admin.service.ts              -> 1835 linhas
admin-pre-chamados.service.ts -> 224 linhas
```

Observacao: Fase 5 ficou apenas local, junto com as Fases 3 e 4 ainda sem commit/deploy. Validado com backend:test, frontend:test, backend:build e backend:lint.

### Fase 6: Relatorios Nao-PMOC

- [x] Criar `admin-relatorios.service.ts`.
- [x] Mover indicadores operacionais, receitas, automacoes pendentes e relatorios avulsos que nao dependem diretamente de PMOC.
- [x] `AdminService` delega.
- [x] Rodar testes antes e depois.

Resultado local da Fase 6:

```text
admin.service.ts                 -> 462 linhas
admin-relatorios.service.ts      -> 34 linhas
admin-relatorio-tecnico-core.ts  -> 1835 linhas
```

Observacao: para preservar comportamento, a logica tecnica compartilhada de relatorios/PDF ficou em `admin-relatorio-tecnico-core.service.ts`; as fachadas de dominio delegam para ele.

### Fase 7: PMOC Por Ultimo

- [x] Criar `admin-pmoc.service.ts`.
- [x] Criar `admin-pmoc-pdf.service.ts`.
- [x] Mover PMOC somente depois das fases anteriores estabilizadas.
- [x] Validar assinatura, webhook Assinafy, Drive e email final.

Resultado local da Fase 7:

```text
admin-pmoc.service.ts      -> 18 linhas
admin-pmoc-pdf.service.ts  -> 15 linhas
```

Observacao: Fases 6 e 7 ficaram apenas locais, ainda sem commit/deploy. Validado com backend:test, frontend:test, backend:build e backend:lint.

### Fase 8: Frontend Admin JS

- [x] Migrar progressivamente para `type="module"`.
- [x] Criar `apps/admin/js/main.js`.
- [x] Criar modulos por area: `agenda`, `recorrencias`, `frota`, `clientes`, `pmoc`.
- [x] Migrar agenda/recorrencias/frota antes de PMOC.

Resultado local da Fase 8:

```text
apps/admin/js/main.js
apps/admin/js/modules/agenda.js
apps/admin/js/modules/recorrencias.js
apps/admin/js/modules/frota.js
apps/admin/js/modules/clientes.js
apps/admin/js/modules/pmoc.js
```

Observacao: migracao progressiva. `main.js` carrega metadados por area e importa o `script.js` legado para preservar comportamento enquanto as funcoes forem movidas em cortes menores.

### Fase 9: CSS/HTML

- [x] Separar CSS por area: base, layout, agenda, frota, clientes, PMOC.
- [x] Manter `index.html` por enquanto.
- [x] Avaliar partials/templates so depois do JS estabilizado.

Resultado local da Fase 9:

```text
apps/admin/css/base.css
apps/admin/css/layout.css
apps/admin/css/agenda.css
apps/admin/css/frota.css
apps/admin/css/clientes.css
apps/admin/css/pmoc.css
```

Observacao: `styles.css` virou agregador inicial com `@import` dos arquivos por area e ainda mantem as regras antigas para evitar regressao visual. O proximo passo e mover os blocos CSS reais aos poucos.

### Fase 10: Regra Permanente

- [ ] Cada fase vira commit separado.
- [ ] Primeiro mover, depois melhorar.
- [ ] Testar antes e depois de cada corte.
- [ ] PMOC nao entra em refactor ate existir seguranca suficiente.

1. [ ] Compartilhar a pasta do Drive com `drive-integracao@automacao-499404.iam.gserviceaccount.com` como `Editor`.
2. [ ] Repetir teste de upload no Drive.
3. [ ] Fazer backfill dos PDFs PMOC ja assinados para a pasta do Drive e preencher `pdf_drive_url`.
4. [ ] Testar novamente com a cliente de teste `Cris Magnani`:
   - solicitar assinatura;
   - engenheiro assinar;
   - confirmar envio para cliente e copia interna;
   - confirmar arquivo salvo no Drive.
5. [ ] Na outra maquina com chave SSH, acessar `airmovebr@191.252.226.11`.
6. [ ] Atualizar a VM com o commit `2bbe740` da branch `main`.
7. [ ] Conferir `.env.production` real na VM sem commitar secrets.
8. [ ] Subir/recriar containers de producao com `--build`.
9. [ ] Rodar `prisma migrate deploy` em producao, incluindo:
   - `20260617073000_flexible_technical_teams`
   - `20260617210000_planos_recorrencia`
10. [ ] Validar por IP: landing, admin e `api/v1/health`.
11. [ ] Se o IP nao responder no Caddy, ajustar proxy temporario para homologacao por IP.
12. [ ] Aguardar o cliente passar acesso/gestao do registro do dominio.
13. [ ] Depois da aprovacao, alterar DNS no Registro.br para a VM Locaweb.
14. [ ] Validar HTTPS publico dos 3 dominios.
15. [ ] Retestar formulario publico de pre-chamado pelo dominio e confirmar entrada no painel.
16. [ ] Fazer teste PMOC completo em homologacao/producao.
17. [ ] Evoluir PDF PMOC profissional:
   - pagina por maquina;
   - ficha tecnica;
   - checklist;
   - evidencias;
   - declaracao;
   - assinatura digital validada.
18. [ ] Revisar Agenda em uso real com OS criadas por pre-chamado, OS manual e plano recorrente.
19. [ ] Revisar Frota.
20. [ ] Preparar backup, logs e permissoes antes de cliente real.
21. [ ] Pensar melhor antes de implementar o fluxo de tecnicos no admin e OS no APK.

## Plano Pausado: Tecnicos no Admin e OS no APK

Nao implementar ainda sem nova confirmacao.

Rascunho discutido:

- Admin tera cadastro de tecnicos com nome, login curto, senha e telefone WhatsApp.
- Admin atribui OS ao tecnico.
- APK tera tela `Meus servicos` por tecnico logado.
- Tecnico abre o cliente/OS no APK e entra no checklist do servico.
- Notificacao v1 sera dentro do app, sem push real.
- WhatsApp fica preparado para depois; sem API do WhatsApp por enquanto.

## Seguranca

- Nao commitar `.env`, `.env.local` ou `.env.production`.
- Nao expor senha, token SMTP, token Assinafy, private key Google, JWT secret ou banco no chat.
- Banco de producao deve ficar sem porta publica.
- PDFs assinados locais ficam em `apps/backend/storage/` e nao devem ir para Git.
- Antes de cliente real: backup automatico, logs sem dados sensiveis e revisao de perfis `tecnico`, `supervisor`, `admin`.

## Anotacao para depois

- Remover a copia interna/BCC (`PMOC_INTERNAL_COPY_EMAIL`) do fluxo PMOC. Ela ficou redundante porque a AIRMOVEBR ja recebe/guarda o envio na propria caixa de e-mail, e o Drive sera o arquivo oficial quando a permissao da pasta estiver corrigida.
- Retomar o plano de tecnicos/OS/checklist no APK somente depois de confirmar o desenho operacional com calma.
