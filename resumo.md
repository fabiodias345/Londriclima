# Resumo AIRMOVEBR

Atualizado em: 13/06/2026

## Estado Atual

- Workspace: `C:\develop\LondriClima`
- Branch atual: `dev`
- Branches alinhadas no GitHub: `dev`, `main`, `seg`
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

- Admin com login, agenda, clientes, frota, relatorios, PMOC e fluxo de assinatura.
- PMOC por cliente com dossie, PDF, token de assinatura e pagina publica para engenheiro.
- Dossie PMOC mostra Jan-Dez: vermelho para mes ja enviado ao engenheiro e verde para mes ainda pendente.
- Solicitacao de assinatura do engenheiro pelo admin sem expor token ao operador.
- Confirmacao publica do engenheiro exige upload do PDF assinado no Gov.br.
- Automacoes SMTP para:
  - enviar link de assinatura ao engenheiro;
  - enviar relatorio PMOC final assinado ao cliente.
- E-mail final do cliente revisado:
  - assunto com mes/ano e cliente;
  - texto profissional;
  - dados do engenheiro no corpo;
  - PDF assinado no Gov.br anexado.
- Payload final do agendamento carrega cliente, engenheiro, data, hash e PDF assinado em base64.
- Branches `dev`, `main` e `seg` alinhadas no remoto.

## Validacoes

Ultima rodada local:

```text
npm.cmd run backend:lint  -> OK
npm.cmd run backend:test  -> 78/78 OK
npm.cmd run backend:build -> OK
npm.cmd run frontend:test -> 8/8 OK
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

1. [ ] Confirmar DNS no Registro.br para os 3 hosts apontando para `191.252.226.11`.
2. [ ] Atualizar a VM com o commit mais recente da branch `main`.
3. [ ] Rodar `prisma migrate deploy` em producao.
4. [ ] Subir/recriar containers de producao com `--build`.
5. [ ] Validar HTTPS publico dos 3 dominios.
6. [ ] Configurar SMTP real em `.env.production` e testar envio de e-mail.
7. [ ] Fazer teste PMOC completo em homologacao/producao:
   - gerar PDF;
   - enviar assinatura ao engenheiro;
   - assinar PDF no Gov.br;
   - enviar PDF assinado pela pagina publica;
   - conferir e-mail final do cliente com PDF anexado.
8. [ ] Evoluir PDF PMOC profissional:
   - pagina por maquina;
   - ficha tecnica;
   - checklist;
   - evidencias;
   - declaracao e assinaturas.
9. [ ] Revisar Agenda.
10. [ ] Revisar Frota.
11. [ ] Aplicar logo real quando o arquivo estiver no workspace.
12. [ ] Preparar backup, logs e permissoes antes de cliente real.

## Seguranca

- Nao commitar `.env.production`.
- Nao expor senha, token SMTP, JWT secret ou banco no chat.
- Banco de producao deve ficar sem porta publica.
- Antes de cliente real: backup automatico, logs sem dados sensiveis e revisao de perfis `tecnico`, `supervisor`, `admin`.
