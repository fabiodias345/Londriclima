# Segurança do Admin, limpeza do Strix e deploy — Plano de Implementação

> **For agentic workers:** executar as tarefas em ordem, com commit por fase e validação antes do deploy.

**Goal:** Remover os artefatos do Strix, eliminar a senha padrão `admin/123456`, manter o Admin funcionando e publicar a correção com validação local e de produção sem tocar Meta/WhatsApp.

**Architecture:** O backend continuará usando `PasswordHashService` com scrypt. A senha inicial/rotacionada será fornecida somente por variável ou arquivo secreto fora do Git; o seed não terá fallback. A troca será feita por comando administrativo idempotente, preservando o usuário admin existente.

**Tech Stack:** NestJS, Prisma, PostgreSQL, scrypt, Docker Compose, Caddy, GitHub Actions.

---

### Fase 0: Issues, baseline e proteção operacional

**Arquivos:** `docs/resumo.md`, `docs/superpowers/plans/2026-08-11-admin-security-cleanup-deploy.md`

- [ ] Criar Issues separadas para limpeza do Strix, segurança da senha admin, validação/reteste e deploy.
- [ ] Registrar que Meta, WhatsApp, SMTP, Assinafy, ViaCEP e APIs externas não serão chamados durante a validação.
- [ ] Confirmar backup/estado atual antes de qualquer alteração destrutiva.

### Fase 1: Limpeza controlada do Strix

**Arquivos:** `strix_runs/`, `.tmp/strix/`

- [ ] Preservar somente os três relatórios `*.pt-BR.md`.
- [ ] Remover binário portátil, sandbox artifacts, SARIF, JSON, CSV, `run.json`, estado dos agents e relatórios originais em inglês.
- [ ] Confirmar que nenhum commit existente contém código do Strix; não reescrever histórico legítimo do projeto.
- [ ] Commit: `chore: limpar artefatos temporarios do strix`.

### Fase 2: Remover credencial padrão do Admin

**Arquivos:** `apps/admin/index.html`, `apps/backend/prisma/seed.ts`, `apps/backend/package.json`

- [ ] Remover `value="123456"` do formulário de login.
- [ ] Alterar o seed para exigir `ADMIN_INITIAL_PASSWORD` e rejeitar senha ausente, curta ou igual a `123456`.
- [ ] Adicionar comando `admin:password` para atualizar o hash do usuário admin existente sem apagar o usuário.
- [ ] Não registrar senha, token ou hash nos logs.
- [ ] Atualizar fixtures de teste sem alterar dados de produção.
- [ ] Commit: `fix: remover senha padrao do admin`.

### Fase 3: Rotação segura sem indisponibilidade

**Arquivos:** `apps/backend/prisma/set-admin-password.ts`, `apps/backend/package.json`, `infra/docker-compose.yml`, `infra/docker-compose.prod.example.yml`, `.env.production.example`

- [ ] Implementar rotação por variável temporária `ADMIN_PASSWORD`, selecionando o usuário `login=admin` e atualizando apenas `senhaHash`.
- [ ] Exigir `ADMIN_PASSWORD` somente durante o comando de rotação; não persistir a senha no repositório.
- [ ] Configurar o ambiente local com segredo temporário fora do Git.
- [ ] Preparar o procedimento de produção para executar a rotação antes de remover qualquer acesso antigo.
- [ ] Confirmar login com nova senha e rejeição de `123456` antes do deploy final.
- [ ] Commit: `feat: adicionar rotacao segura da senha admin`.

### Fase 4: Validação local

**Arquivos:** `apps/backend/src/modules/auth/*.spec.ts`, `apps/backend/src/app.http.part-*.spec.ts`

- [ ] Executar build do backend e migrations/seed somente no banco local.
- [ ] Validar healthcheck, login admin com nova senha, rejeição da senha antiga e acesso a uma rota administrativa.
- [ ] Confirmar containers `admin`, `backend` e `postgres` saudáveis.
- [ ] Não executar chamadas Meta/WhatsApp/SMTP/Assinafy/ViaCEP.
- [ ] Commit: `test: validar seguranca do login admin`.

### Fase 5: Deploy e validação de produção

**Arquivos:** `infra/scripts/deploy-prod.sh`, documentação operacional

- [ ] Criar/atualizar Issues e PRs no GitHub com referências entre elas.
- [ ] Exigir autenticação GitHub válida antes de push/deploy.
- [ ] Fazer push e deploy somente após a nova senha ser configurada no servidor por canal seguro.
- [ ] Verificar containers e healthcheck de produção.
- [ ] Validar somente endpoints HTTP de health/login/admin, sem criar, apagar ou alterar dados comerciais e sem acionar integrações externas.
- [ ] Confirmar que a senha antiga falha e a nova senha mantém o acesso administrativo.
- [ ] Atualizar `docs/resumo.md` com fases concluídas, commits, Issues e resultado do deploy.
- [ ] Commit final: `docs: registrar seguranca do admin e deploy`.

## Critérios de conclusão

- Nenhum artefato Strix permanece além dos três relatórios PT-BR.
- O frontend não contém senha padrão.
- O seed não cria/atualiza admin com senha fixa.
- A senha é armazenada somente como hash scrypt.
- O Admin local e produção continuam acessíveis com a nova senha.
- Nenhuma integração Meta/WhatsApp ou API externa é alterada ou acionada.
