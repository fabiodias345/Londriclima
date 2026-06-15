# Resumo AIRMOVEBR

Atualizado em: 14/06/2026

## Estado Atual

- Workspace: `C:\develop\LondriClima`
- Branch atual: `dev`
- Commit atual em `dev` e `main`: `7aeecb7 feat: integra assinatura PMOC com Assinafy e Drive`
- Branches alinhadas no GitHub: `dev` e `main`
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
- Bloqueador externo conhecido: DNS/publicacao HTTPS.

Registros DNS desejados:

```text
airmovebr.com.br       -> 191.252.226.11
admin.airmovebr.com.br -> 191.252.226.11
api.airmovebr.com.br   -> 191.252.226.11
```

Depois do DNS correto:

```text
cd /opt/airmovebr/repo
git pull
docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml up -d --build
docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml exec backend npx prisma migrate deploy
```

Validar:

```text
https://airmovebr.com.br
https://admin.airmovebr.com.br
https://api.airmovebr.com.br/api/v1/health
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
5. [ ] Atualizar a VM com o commit `7aeecb7` da branch `main`.
6. [ ] Rodar `prisma migrate deploy` em producao.
7. [ ] Configurar `.env.production` com Assinafy, SMTP, copia interna e Google Drive.
8. [ ] Subir/recriar containers de producao com `--build`.
9. [ ] Validar HTTPS publico dos 3 dominios.
10. [ ] Fazer teste PMOC completo em homologacao/producao.
11. [ ] Evoluir PDF PMOC profissional:
   - pagina por maquina;
   - ficha tecnica;
   - checklist;
   - evidencias;
   - declaracao;
   - assinatura digital validada.
12. [ ] Revisar Agenda.
13. [ ] Revisar Frota.
14. [ ] Aplicar logo real quando o arquivo estiver no workspace.
15. [ ] Preparar backup, logs e permissoes antes de cliente real.

## Seguranca

- Nao commitar `.env`, `.env.local` ou `.env.production`.
- Nao expor senha, token SMTP, token Assinafy, private key Google, JWT secret ou banco no chat.
- Banco de producao deve ficar sem porta publica.
- PDFs assinados locais ficam em `apps/backend/storage/` e nao devem ir para Git.
- Antes de cliente real: backup automatico, logs sem dados sensiveis e revisao de perfis `tecnico`, `supervisor`, `admin`.

## Anotacao para depois

- Remover a copia interna/BCC (`PMOC_INTERNAL_COPY_EMAIL`) do fluxo PMOC. Ela ficou redundante porque a AIRMOVEBR ja recebe/guarda o envio na propria caixa de e-mail, e o Drive sera o arquivo oficial quando a permissao da pasta estiver corrigida.
