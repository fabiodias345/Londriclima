ssh root@191.252.226.11 "set -e; cd /opt/airmovebr/repo; git fetch origin; git switch main; git pull --ff-only origin main; docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml up -d --build; docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml exec -T backend npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma"
Depois valide:
curl.exe -fsS https://api.airmovebr.com.br/api/v1/health
curl.exe -fsS https://api.airmovebr.com.br/api/v1/health