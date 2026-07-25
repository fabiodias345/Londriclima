git add apps/admin apps/backend
git commit -m "feat: completa fase O5 de orcamentos"
git push origin dev
git switch main
git merge --ff-only dev
git push origin main
git switch dev

ssh airmovebr-prod "cd /opt/airmovebr/repo && git pull --ff-only origin main && docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml up -d --build && docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml exec -T backend npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma"

curl.exe -fsS https://api.airmovebr.com.br/api/v1/health