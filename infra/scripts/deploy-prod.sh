#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-/opt/airmovebr/repo}"
cd "$APP_DIR"

test -f .env.production || { echo "Falta .env.production" >&2; exit 1; }
test -f chaves.env || { echo "Falta chaves.env; pull cancelado" >&2; exit 1; }

git pull --ff-only
docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml up -d --build
docker compose --env-file .env.production -f infra/docker-compose.prod.example.yml ps
