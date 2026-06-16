# Resumo AIRMOVEBR

Atualizado em: 16/06/2026

## Estado Atual

- Workspace: `C:\develop\LondriClima`
- Branch atual: `dev`
- Commit atual em `dev`: `9d10f6c Atualiza landing e fluxo administrativo`
- Commit atual em `main`: `be39dd1 Melhora fluxos PMOC e relatorios operacionais`
- Branch `dev` esta na frente de `main` com a landing nova e ajustes administrativos.
- Branch `seg`: ficou no commit anterior `afdcab9`
- Produto: site, admin e API da AIRMOVEBR para pre-chamado, OS, tecnico, frota, PMOC e automacoes.

## Acessos Locais

```text
Backend health:  http://127.0.0.1:3000/api/v1/health
Admin:           http://127.0.0.1:5174/admin/
Landing:         http://127.0.0.1:5174/landing/
Assinatura PMOC: http://127.0.0.1:5174/landing/assinatura-pmoc.html?token=:token
Adminer:         http://127.0.0.1:8080
Login seed:      tecnico@airmovebr.local / 123456
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
- Commit enviado para GitHub em `dev` e `main`.

## Validacoes

Ultima rodada local antes do commit:

```text
npm.cmd run backend:test  -> 88/88 OK
npm.cmd run frontend:test -> 8/8 OK
npm.cmd run backend:build -> OK
npm.cmd run backend:lint  -> OK
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
git checkout dev
git pull origin dev
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

1. [ ] Compartilhar a pasta do Drive com `drive-integracao@automacao-499404.iam.gserviceaccount.com` como `Editor`.
2. [ ] Repetir teste de upload no Drive.
3. [ ] Fazer backfill dos PDFs PMOC ja assinados para a pasta do Drive e preencher `pdf_drive_url`.
4. [ ] Testar novamente com a cliente de teste `Cris Magnani`:
   - solicitar assinatura;
   - engenheiro assinar;
   - confirmar envio para cliente e copia interna;
   - confirmar arquivo salvo no Drive.
5. [ ] Na outra maquina com chave SSH, acessar `airmovebr@191.252.226.11`.
6. [ ] Atualizar a VM com o commit `9d10f6c` da branch `dev`.
7. [ ] Conferir `.env.production` real na VM sem commitar secrets.
8. [ ] Subir/recriar containers de producao com `--build`.
9. [ ] Rodar `prisma migrate deploy` em producao.
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
18. [ ] Revisar Agenda.
19. [ ] Revisar Frota.
20. [ ] Aplicar logo real quando o arquivo estiver no workspace.
21. [ ] Preparar backup, logs e permissoes antes de cliente real.

## Seguranca

- Nao commitar `.env`, `.env.local` ou `.env.production`.
- Nao expor senha, token SMTP, token Assinafy, private key Google, JWT secret ou banco no chat.
- Banco de producao deve ficar sem porta publica.
- PDFs assinados locais ficam em `apps/backend/storage/` e nao devem ir para Git.
- Antes de cliente real: backup automatico, logs sem dados sensiveis e revisao de perfis `tecnico`, `supervisor`, `admin`.

## Anotacao para depois

- Remover a copia interna/BCC (`PMOC_INTERNAL_COPY_EMAIL`) do fluxo PMOC. Ela ficou redundante porque a AIRMOVEBR ja recebe/guarda o envio na propria caixa de e-mail, e o Drive sera o arquivo oficial quando a permissao da pasta estiver corrigida.
