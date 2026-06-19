# Na VM via SSH
ssh root@191.252.226.11
cd /opt/airmovebr/repo
git pull origin main
git log --oneline -1
docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml up -d --build
docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml ps
curl http://127.0.0.1/api/v1/health