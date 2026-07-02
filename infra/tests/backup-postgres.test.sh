#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/scripts/backup-postgres.sh}"
TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT

mkdir -p "$TEST_DIR/bin" "$TEST_DIR/backups"

cat > "$TEST_DIR/bin/docker" <<'DOCKER'
#!/usr/bin/env bash
set -euo pipefail

case "$*" in
  *pg_dump*)
    printf 'valid-custom-dump\n'
    ;;
  *"pg_restore --list"*)
    grep -q '^valid-custom-dump$'
    ;;
  *)
    printf 'unexpected docker arguments: %s\n' "$*" >&2
    exit 64
    ;;
esac
DOCKER
chmod +x "$TEST_DIR/bin/docker"

printf 'stale\n' > "$TEST_DIR/backups/airmovebr-20200101T000000.dump"
printf 'stale-checksum\n' > "$TEST_DIR/backups/airmovebr-20200101T000000.dump.sha256"
touch -d '10 days ago' "$TEST_DIR/backups/airmovebr-20200101T000000.dump"

PATH="$TEST_DIR/bin:$PATH" \
BACKUP_DIR="$TEST_DIR/backups" \
LOCK_FILE="$TEST_DIR/backup.lock" \
LOCAL_RETENTION_DAYS=7 \
bash "$SCRIPT_PATH"

mapfile -t dumps < <(find "$TEST_DIR/backups" -maxdepth 1 -type f -name 'airmovebr-*.dump')
test "${#dumps[@]}" -eq 1
test ! -e "$TEST_DIR/backups/airmovebr-20200101T000000.dump.sha256"
test -s "${dumps[0]}"
test -s "${dumps[0]}.sha256"
(cd "$TEST_DIR/backups" && sha256sum --check "$(basename "${dumps[0]}.sha256")")

exec 8> "$TEST_DIR/backup.lock"
flock -n 8
if PATH="$TEST_DIR/bin:$PATH" \
  BACKUP_DIR="$TEST_DIR/backups" \
  LOCK_FILE="$TEST_DIR/backup.lock" \
  bash "$SCRIPT_PATH"; then
  echo 'expected concurrent execution to fail' >&2
  exit 1
else
  test "$?" -eq 75
fi

echo 'backup-postgres.test.sh: PASS'
