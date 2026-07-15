# Commit e deploy do site

Use este bloco para publicar alterações da landing. Não copie o texto `PS C:\...>` do terminal; cole somente os comandos abaixo.

```powershell
git switch dev
git add -- apps/landing/index.html apps/landing/css/style.css apps/landing/js/main.js tests/frontend-contracts.test.js
git diff --cached --check
git diff --cached --stat
git commit -m "site: melhora layout e formulario"
git push origin dev

git fetch origin
git switch main
git pull --ff-only origin main
git merge --ff-only dev
git push origin main
git switch dev
```

Antes do `git add`, ajuste a lista de arquivos para a tarefa atual. Não use `git add -A`: ele pode incluir arquivos locais sem querer.

Se o `git diff --cached --stat` não mostrar arquivos, não rode o `git commit`: não há alteração preparada para publicar.

## Deploy na VPS

```powershell
ssh root@191.252.226.11 'set -e; cd /opt/airmovebr/repo; git fetch origin; git switch main; git pull --ff-only origin main; docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml up -d --build; docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml exec -T backend npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma; docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml ps; docker run --rm --network container:infra-backend-1 curlimages/curl:8.11.1 -fsS http://127.0.0.1:3000/api/v1/health'
```

## Validação pública

```powershell
curl.exe -fsS https://api.airmovebr.com.br/api/v1/health
curl.exe -fsSI https://airmovebr.com.br/
curl.exe -fsSI https://admin.airmovebr.com.br/
```

No erro enviado, o deploy concluiu corretamente: commit `5105812`, push, promoção para `main` e health `ok`. A mensagem `Changes not staged for commit` era apenas o resultado do `git status` executado antes do `git add`.
