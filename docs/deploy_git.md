# Commit e deploy seguro

## Antes de iniciar uma alteracao

```powershell
git switch dev
git pull --ff-only origin dev
git status --short --branch
```

## Commit e promocao para producao

Substitua os caminhos e a mensagem pelos arquivos da tarefa. Nao use `git add -A`: ele pode incluir `output/`, arquivos locais ou credenciais sem querer.

```powershell
git status --short
git add -- apps/landing/index.html apps/landing/css/style.css
git diff --cached --check
git diff --cached --stat
git commit -m "fix(landing): alinha secoes e imagens"
git push origin dev

git fetch origin
git switch main
git pull --ff-only origin main
git merge --ff-only dev
git push origin main
git switch dev
```

`git merge --ff-only` interrompe a publicacao se o historico nao estiver linear; resolva isso na `dev`, teste novamente e so entao repita a promocao.

## Deploy na VPS

O servidor tambem atualiza apenas por fast-forward, para nao misturar alteracoes manuais com a versao publicada.

```powershell
ssh root@191.252.226.11 'set -e; cd /opt/airmovebr/repo; git fetch origin; git switch main; git pull --ff-only origin main; docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml up -d --build; docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml exec -T backend npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma; docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml ps; docker run --rm --network container:infra-backend-1 curlimages/curl:8.11.1 -fsS http://127.0.0.1:3000/api/v1/health'
```

## Validacao publica

```powershell
curl.exe -fsS https://api.airmovebr.com.br/api/v1/health
curl.exe -fsSI https://airmovebr.com.br/
curl.exe -fsSI https://admin.airmovebr.com.br/
```

Se houver migration, mantenha o comando Prisma. Para mudancas somente de arquivos estaticos, o mesmo deploy continua valido e atualiza a landing montada pelo Caddy.
