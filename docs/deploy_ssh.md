git switch dev
git status
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/20260620170000_pmoc_equipamento_ocupacao apps/backend/prisma/seed_pmoc_black_workout.sql apps/backend/src/modules/admin/dto/salvar-equipamento.dto.ts apps/backend/src/modules/admin/services/admin-equipamentos.service.ts apps/backend/src/modules/admin/services/admin-relatorio-tecnico-core.service.ts apps/backend/src/modules/admin/services/admin-pmoc-pdf-renderer.service.ts apps/backend/src/modules/admin/admin.service.part-05.spec.ts docs/pmoc.md docs/deploy_ssh.md
git commit -m "feat: adiciona dados e campos PMOC Black Workout"
git push origin dev
git switch main
git merge --ff-only dev
git push origin main
git switch dev

@'
set -euo pipefail
cd /opt/airmovebr/repo
git pull origin main
git log --oneline -1
docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml up -d --build
docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml exec -T backend npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma
set -a
. ./.env.production
set +a
docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < apps/backend/prisma/seed_pmoc_black_workout.sql
docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml ps
curl -i http://127.0.0.1/api/v1/health
docker run --rm --network container:infra-backend-1 curlimages/curl:8.11.1 -fsS http://127.0.0.1:3000/api/v1/health
'@ | ssh root@191.252.226.11 bash -se
