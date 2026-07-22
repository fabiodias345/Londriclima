$ErrorActionPreference = "Stop"

function Invoke-GitStep {
  param([string[]]$Arguments)
  & git @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Falha: git $($Arguments -join ' ')" }
}

Invoke-GitStep @("switch", "dev")
Invoke-GitStep @("fetch", "origin")
Invoke-GitStep @("add", "-A")
npm run frontend:test
if ($LASTEXITCODE -ne 0) { throw "Falha nos testes do frontend" }
Invoke-GitStep @("diff", "--cached", "--check")
Invoke-GitStep @("diff", "--cached", "--stat")
Invoke-GitStep @("status", "--short")

& git diff --cached --quiet
if ($LASTEXITCODE -eq 0) { throw "Nenhuma alteração staged para commit" }

Invoke-GitStep @("commit", "-m", "fix: corrige atendimento WhatsApp e logo")
Invoke-GitStep @("rebase", "origin/dev")
Invoke-GitStep @("push", "origin", "dev")

Invoke-GitStep @("switch", "main")
Invoke-GitStep @("pull", "--ff-only", "origin", "main")
Invoke-GitStep @("merge", "--ff-only", "dev")
Invoke-GitStep @("push", "origin", "main")
Invoke-GitStep @("switch", "dev")
Invoke-GitStep @("status", "--short")
Invoke-GitStep @("log", "-3", "--oneline", "--decorate")

ssh root@191.252.226.11 "set -e; cd /opt/airmovebr/repo; git fetch origin; git switch main; git pull --ff-only origin main; docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml up -d --build; docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml exec -T backend npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma; docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml ps; docker run --rm --network container:infra-backend-1 curlimages/curl:8.11.1 -fsS http://127.0.0.1:3000/api/v1/health"
if ($LASTEXITCODE -ne 0) { throw "Falha no deploy da Locaweb" }

curl.exe -fsS https://api.airmovebr.com.br/api/v1/health
curl.exe -fsS https://airmovebr.com.br/
curl.exe -fsS https://admin.airmovebr.com.br/