#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-/opt/airmovebr/repo}"
cd "$APP_DIR"

if [ -f .env.production ]; then
  echo ".env.production already exists; refusing to overwrite"
  exit 0
fi

umask 077
DB_PASSWORD="$(openssl rand -hex 24)"
JWT_ACCESS_SECRET="$(openssl rand -hex 48)"
JWT_REFRESH_SECRET="$(openssl rand -hex 48)"

cat > .env.production <<EOF
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1

POSTGRES_DB=airmovebr_prod
POSTGRES_USER=airmovebr_prod
POSTGRES_PASSWORD=$DB_PASSWORD
DATABASE_URL=postgresql://airmovebr_prod:$DB_PASSWORD@postgres:5432/airmovebr_prod?schema=public

JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_ACCESS_EXPIRES_IN_SECONDS=900
JWT_REFRESH_EXPIRES_IN_SECONDS=2592000
EOF

chmod 600 .env.production
stat -c "%a %U %G %n" .env.production
grep -E "^(NODE_ENV|POSTGRES_DB|POSTGRES_USER|JWT_ACCESS_EXPIRES_IN_SECONDS|JWT_REFRESH_EXPIRES_IN_SECONDS)=" .env.production
echo "DATABASE_URL=postgresql://airmovebr_prod:***@postgres:5432/airmovebr_prod?schema=public"
