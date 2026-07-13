git switch dev
git status
git add -A
git commit -m "docs: atualiza estado operacional"
git push origin dev
git switch main
git pull --ff-only origin main
git merge --ff-only dev
git push origin main
git switch dev

ssh root@191.252.226.11 "cd /opt/airmovebr/repo && git pull origin main && docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml up -d --build && docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml exec -T backend npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma && docker run --rm --network container:infra-backend-1 curlimages/curl:8.11.1 -fsS http://127.0.0.1:3000/api/v1/health"
