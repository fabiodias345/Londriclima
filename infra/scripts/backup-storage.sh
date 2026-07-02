#!/usr/bin/env bash
set -euo pipefail

STORAGE_PATH="${STORAGE_PATH:-/var/lib/docker/volumes/infra_storage_data/_data}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/airmovebr/storage}"
LOCK_FILE="${LOCK_FILE:-/run/lock/airmovebr-backup-storage.lock}"
LOCAL_RETENTION_DAYS="${LOCAL_RETENTION_DAYS:-7}"

if [[ ! "$LOCAL_RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  echo "LOCAL_RETENTION_DAYS must be a non-negative integer" >&2
  exit 64
fi

if [[ ! -d "$STORAGE_PATH" ]]; then
  echo "storage path not found: $STORAGE_PATH" >&2
  exit 66
fi

for command_name in find flock sha256sum tar; do
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
final_file="$BACKUP_DIR/airmovebr-storage-$timestamp.tar.gz"
checksum_file="$final_file.sha256"
temporary_file="$BACKUP_DIR/.airmovebr-storage-$timestamp.tar.gz.tmp"
temporary_checksum="$BACKUP_DIR/.airmovebr-storage-$timestamp.tar.gz.sha256.tmp"

cleanup() {
  rm -f -- "$temporary_file" "$temporary_checksum"
}
trap cleanup EXIT

tar --create --gzip --file "$temporary_file" \
  --directory "$STORAGE_PATH" --one-file-system .

if [[ ! -s "$temporary_file" ]]; then
  echo "tar produced an empty archive" >&2
  exit 65
fi

tar --list --gzip --file "$temporary_file" > /dev/null

checksum="$(sha256sum "$temporary_file")"
printf '%s  %s\n' "${checksum%% *}" "$(basename "$final_file")" \
  > "$temporary_checksum"

chmod 0600 "$temporary_file" "$temporary_checksum"
mv -- "$temporary_file" "$final_file"
mv -- "$temporary_checksum" "$checksum_file"

while IFS= read -r -d '' expired_file; do
  rm -f -- "$expired_file" "$expired_file.sha256"
done < <(
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'airmovebr-storage-*.tar.gz' \
    -mmin "+$retention_minutes" -print0
)

echo "backup completed: $final_file"
