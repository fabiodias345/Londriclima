Faça o commit das alterações atuais sem incluir arquivos não relacionados.

Depois:
1. Garanta que dev esteja no commit criado.
2. Atualize main para o mesmo commit e faça push de dev e main.
3. Na VM, execute:
   git fetch origin
   git switch main
   git pull --ff-only origin main
   docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml up -d --build
4. Valide API, site público e confirme que a VM está no mesmo commit de origin/main.
5. Volte para a branch dev.
6. Não use git reset --hard nem git clean.

Informe commit, branches, deploy e healthcheck.