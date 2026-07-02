#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/scripts/backup-storage.sh}"
TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT

SOURCE_DIR="$TEST_DIR/source"
BACKUP_DIR="$TEST_DIR/backups"
mkdir -p \
  "$SOURCE_DIR/os/ordem/evidencias" \
  "$SOURCE_DIR/os/ordem/assinaturas" \
  "$SOURCE_DIR/pmoc" \
  "$BACKUP_DIR"

printf 'foto\n' > "$SOURCE_DIR/os/ordem/evidencias/foto.jpg"
printf 'assinatura\n' > "$SOURCE_DIR/os/ordem/assinaturas/assinatura.png"
printf 'pdf\n' > "$SOURCE_DIR/pmoc/relatorio.pdf"

printf 'stale\n' > "$BACKUP_DIR/airmovebr-storage-20200101T000000Z.tar.gz"
printf 'stale-checksum\n' > "$BACKUP_DIR/airmovebr-storage-20200101T000000Z.tar.gz.sha256"
touch -d '10 days ago' "$BACKUP_DIR/airmovebr-storage-20200101T000000Z.tar.gz"

STORAGE_PATH="$SOURCE_DIR" \
BACKUP_DIR="$BACKUP_DIR" \
LOCK_FILE="$TEST_DIR/backup.lock" \
LOCAL_RETENTION_DAYS=7 \
bash "$SCRIPT_PATH"

mapfile -t archives < <(
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'airmovebr-storage-*.tar.gz'
)
test "${#archives[@]}" -eq 1
test ! -e "$BACKUP_DIR/airmovebr-storage-20200101T000000Z.tar.gz.sha256"
test -s "${archives[0]}"
test -s "${archives[0]}.sha256"
(cd "$BACKUP_DIR" && sha256sum --check "$(basename "${archives[0]}.sha256")")

archive_listing="$(tar --list --gzip --file "${archives[0]}")"
grep -q './os/ordem/evidencias/foto.jpg' <<< "$archive_listing"
grep -q './os/ordem/assinaturas/assinatura.png' <<< "$archive_listing"
grep -q './pmoc/relatorio.pdf' <<< "$archive_listing"

exec 8> "$TEST_DIR/backup.lock"
flock -n 8
if STORAGE_PATH="$SOURCE_DIR" \
  BACKUP_DIR="$BACKUP_DIR" \
  LOCK_FILE="$TEST_DIR/backup.lock" \
  bash "$SCRIPT_PATH"; then
  echo 'expected concurrent execution to fail' >&2
  exit 1
else
  test "$?" -eq 75
fi

echo 'backup-storage.test.sh: PASS'
