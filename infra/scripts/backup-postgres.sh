#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/airmovebr/postgres}"
LOCK_FILE="${LOCK_FILE:-/run/lock/airmovebr-backup-postgres.lock}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-infra-postgres-1}"
LOCAL_RETENTION_DAYS="${LOCAL_RETENTION_DAYS:-7}"

if [[ ! "$LOCAL_RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  echo "LOCAL_RETENTION_DAYS must be a non-negative integer" >&2
  exit 64
fi

for command_name in docker find flock sha256sum; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "required command not found: $command_name" >&2
    exit 69
  fi
done

umask 077
install -d -m 0700 "$BACKUP_DIR" "$(dirname "$LOCK_FILE")"

exec 9> "$LOCK_FILE"
if ! flock -n 9; then
  echo "backup already running" >&2
  exit 75
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
retention_minutes="$((LOCAL_RETENTION_DAYS * 24 * 60))"
final_file="$BACKUP_DIR/airmovebr-$timestamp.dump"
checksum_file="$final_file.sha256"
temporary_file="$BACKUP_DIR/.airmovebr-$timestamp.dump.tmp"
temporary_checksum="$BACKUP_DIR/.airmovebr-$timestamp.dump.sha256.tmp"

cleanup() {
  rm -f -- "$temporary_file" "$temporary_checksum"
}
trap cleanup EXIT

docker exec "$POSTGRES_CONTAINER" sh -c \
  'exec pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --format=custom --compress=9 --no-owner --no-privileges' \
  > "$temporary_file"

if [[ ! -s "$temporary_file" ]]; then
  echo "pg_dump produced an empty archive" >&2
  exit 65
fi

docker exec -i "$POSTGRES_CONTAINER" pg_restore --list \
  < "$temporary_file" > /dev/null

checksum="$(sha256sum "$temporary_file")"
printf '%s  %s\n' "${checksum%% *}" "$(basename "$final_file")" \
  > "$temporary_checksum"

chmod 0600 "$temporary_file" "$temporary_checksum"
mv -- "$temporary_file" "$final_file"
mv -- "$temporary_checksum" "$checksum_file"

while IFS= read -r -d '' expired_file; do
  rm -f -- "$expired_file" "$expired_file.sha256"
done < <(
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'airmovebr-*.dump' \
    -mmin "+$retention_minutes" -print0
)

echo "backup completed: $final_file"
