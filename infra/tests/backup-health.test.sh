#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/scripts/check-backup-health.sh}"
TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT

mkdir -p "$TEST_DIR/bin" "$TEST_DIR/postgres" "$TEST_DIR/storage"
printf 'dump\n' > "$TEST_DIR/postgres/airmovebr-2026.dump"
printf 'files\n' > "$TEST_DIR/storage/airmovebr-storage-2026.tar.gz"

cat > "$TEST_DIR/bin/restic" <<'RESTIC'
#!/usr/bin/env bash
set -euo pipefail
timestamp="$(date -u +%Y-%m-%dT%H:%M:%S.000000000Z)"
printf '[{"time":"%s"}]\n' "$timestamp"
RESTIC
chmod +x "$TEST_DIR/bin/restic"

cat > "$TEST_DIR/backblaze.env" <<EOF
AWS_ACCESS_KEY_ID=test-key
AWS_SECRET_ACCESS_KEY=test-secret
RESTIC_REPOSITORY=test-repository
RESTIC_PASSWORD_FILE=$TEST_DIR/restic-password
EOF
printf 'test-password\n' > "$TEST_DIR/restic-password"
chmod 600 "$TEST_DIR/backblaze.env" "$TEST_DIR/restic-password"

PATH="$TEST_DIR/bin:$PATH" \
CONFIG_FILE="$TEST_DIR/backblaze.env" \
POSTGRES_BACKUP_DIR="$TEST_DIR/postgres" \
STORAGE_BACKUP_DIR="$TEST_DIR/storage" \
MAX_AGE_SECONDS=28800 \
bash "$SCRIPT_PATH"

touch -d '12 hours ago' "$TEST_DIR/postgres/airmovebr-2026.dump"
if PATH="$TEST_DIR/bin:$PATH" \
  CONFIG_FILE="$TEST_DIR/backblaze.env" \
  POSTGRES_BACKUP_DIR="$TEST_DIR/postgres" \
  STORAGE_BACKUP_DIR="$TEST_DIR/storage" \
  MAX_AGE_SECONDS=28800 \
  bash "$SCRIPT_PATH"; then
  echo 'expected stale backup detection to fail' >&2
  exit 1
fi

echo 'backup-health.test.sh: PASS'
