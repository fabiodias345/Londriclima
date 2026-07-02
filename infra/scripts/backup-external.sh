#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="${CONFIG_FILE:-/etc/airmovebr/backblaze.env}"
POSTGRES_BACKUP_DIR="${POSTGRES_BACKUP_DIR:-/var/backups/airmovebr/postgres}"
STORAGE_BACKUP_DIR="${STORAGE_BACKUP_DIR:-/var/backups/airmovebr/storage}"
LOCK_FILE="${LOCK_FILE:-/run/lock/airmovebr-backup-external.lock}"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "configuration file not found: $CONFIG_FILE" >&2
  exit 78
fi

if [[ -n "$(find "$CONFIG_FILE" -maxdepth 0 -perm /077 -print)" ]]; then
  echo "configuration file permissions must be 0600: $CONFIG_FILE" >&2
  exit 77
fi

set -a
source "$CONFIG_FILE"
set +a

for variable_name in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY RESTIC_REPOSITORY RESTIC_PASSWORD_FILE; do
  if [[ -z "${!variable_name:-}" ]]; then
    echo "required configuration is empty: $variable_name" >&2
    exit 78
  fi
done

for directory in "$POSTGRES_BACKUP_DIR" "$STORAGE_BACKUP_DIR"; do
  if [[ ! -d "$directory" ]]; then
    echo "backup directory not found: $directory" >&2
    exit 66
  fi
done

for command_name in find flock restic sha256sum; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "required command not found: $command_name" >&2
    exit 69
  fi
done

verify_checksums() {
  local directory="$1"
  local checksum_file
  local -a checksum_files

  shopt -s nullglob
  checksum_files=("$directory"/*.sha256)
  shopt -u nullglob

  if (( ${#checksum_files[@]} == 0 )); then
    echo "no checksums found in $directory" >&2
    exit 65
  fi

  for checksum_file in "${checksum_files[@]}"; do
    (cd "$directory" && sha256sum --check --status "$(basename "$checksum_file")")
  done
}

umask 077
install -d -m 0700 "$(dirname "$LOCK_FILE")" "${RESTIC_CACHE_DIR:-/var/cache/airmovebr-restic}"

exec 9> "$LOCK_FILE"
if ! flock -n 9; then
  echo "external backup already running" >&2
  exit 75
fi

verify_checksums "$POSTGRES_BACKUP_DIR"
verify_checksums "$STORAGE_BACKUP_DIR"

if ! restic cat config > /dev/null 2>&1; then
  restic init
fi

restic backup \
  --host airmovebr-prod \
  --tag automated \
  "$POSTGRES_BACKUP_DIR" "$STORAGE_BACKUP_DIR"

restic forget \
  --host airmovebr-prod \
  --tag automated \
  --keep-daily 14 \
  --keep-weekly 8 \
  --keep-monthly 12 \
  --prune

restic snapshots --latest 1
echo 'external backup completed'
