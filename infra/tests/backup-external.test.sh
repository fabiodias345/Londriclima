#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/scripts/backup-external.sh}"
TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT

mkdir -p "$TEST_DIR/bin" "$TEST_DIR/postgres" "$TEST_DIR/storage"
printf 'database\n' > "$TEST_DIR/postgres/airmovebr.dump"
printf 'files\n' > "$TEST_DIR/storage/airmovebr-storage.tar.gz"
(cd "$TEST_DIR/postgres" && sha256sum airmovebr.dump > airmovebr.dump.sha256)
(cd "$TEST_DIR/storage" && sha256sum airmovebr-storage.tar.gz > airmovebr-storage.tar.gz.sha256)

cat > "$TEST_DIR/bin/restic" <<'RESTIC'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$RESTIC_TEST_LOG"
case "$1" in
  cat)
    test -e "$RESTIC_TEST_REPOSITORY"
    ;;
  init)
    touch "$RESTIC_TEST_REPOSITORY"
    ;;
esac
RESTIC
chmod +x "$TEST_DIR/bin/restic"

cat > "$TEST_DIR/backblaze.env" <<EOF
AWS_ACCESS_KEY_ID=test-key-id
AWS_SECRET_ACCESS_KEY=test-application-key
RESTIC_REPOSITORY=s3:s3.us-east-005.backblazeb2.com/londriclima-storage/restic
RESTIC_PASSWORD_FILE=$TEST_DIR/restic-password
RESTIC_CACHE_DIR=$TEST_DIR/cache
EOF
printf 'test-recovery-password-with-32-chars\n' > "$TEST_DIR/restic-password"
chmod 600 "$TEST_DIR/backblaze.env" "$TEST_DIR/restic-password"

export RESTIC_TEST_LOG="$TEST_DIR/restic.log"
export RESTIC_TEST_REPOSITORY="$TEST_DIR/repository-created"
PATH="$TEST_DIR/bin:$PATH" \
CONFIG_FILE="$TEST_DIR/backblaze.env" \
POSTGRES_BACKUP_DIR="$TEST_DIR/postgres" \
STORAGE_BACKUP_DIR="$TEST_DIR/storage" \
LOCK_FILE="$TEST_DIR/backup.lock" \
bash "$SCRIPT_PATH"

grep -q '^cat config$' "$RESTIC_TEST_LOG"
grep -q '^init$' "$RESTIC_TEST_LOG"
grep -q "^backup .*${TEST_DIR}/postgres ${TEST_DIR}/storage" "$RESTIC_TEST_LOG"
grep -q '^forget .*--keep-daily 14 .*--keep-weekly 8 .*--keep-monthly 12 .*--prune$' "$RESTIC_TEST_LOG"
grep -q '^snapshots --latest 1$' "$RESTIC_TEST_LOG"

before_count="$(grep -c '^init$' "$RESTIC_TEST_LOG")"
PATH="$TEST_DIR/bin:$PATH" \
CONFIG_FILE="$TEST_DIR/backblaze.env" \
POSTGRES_BACKUP_DIR="$TEST_DIR/postgres" \
STORAGE_BACKUP_DIR="$TEST_DIR/storage" \
LOCK_FILE="$TEST_DIR/backup.lock" \
bash "$SCRIPT_PATH"
after_count="$(grep -c '^init$' "$RESTIC_TEST_LOG")"
test "$before_count" -eq "$after_count"

echo 'backup-external.test.sh: PASS'
