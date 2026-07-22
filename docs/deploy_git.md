git switch dev

git add -- apps/admin/css/layout.css apps/admin/css/responsive.css apps/admin/css/whatsapp.css apps/admin/styles.css apps/admin/js/main.js apps/admin/js/modules/whatsapp.js apps/backend/src/modules/whatsapp/whatsapp-admin.controller.ts apps/backend/src/modules/whatsapp/whatsapp.service.spec.ts apps/backend/src/modules/whatsapp/whatsapp.service.ts docs/resumo.md docs/superpowers/plans/2026-07-21-central-atendimento-whatsapp.md

git diff --cached --check
git diff --cached --stat
git status --short

git commit -m "feat: melhora central de atendimento WhatsApp"
git push origin dev

git fetch origin
git switch main
git pull --ff-only origin main
git merge --ff-only dev
git push origin main
git switch dev

ssh root@191.252.226.11 "set -e; cd /opt/airmovebr/repo; git fetch origin; git switch main; git pull --ff-only origin main; docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml up -d --build; docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml exec -T backend npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma; docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml ps; docker run --rm --network container:infra-backend-1 curlimages/curl:8.11.1 -fsS http://127.0.0.1:3000/api/v1/health"

curl.exe -fsS https://api.airmovebr.com.br/api/v1/health
curl.exe -fsS https://airmovebr.com.br/
curl.exe -fsS https://admin.airmovebr.com.br/