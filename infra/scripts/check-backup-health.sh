#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="${CONFIG_FILE:-/etc/airmovebr/backblaze.env}"
POSTGRES_BACKUP_DIR="${POSTGRES_BACKUP_DIR:-/var/backups/airmovebr/postgres}"
STORAGE_BACKUP_DIR="${STORAGE_BACKUP_DIR:-/var/backups/airmovebr/storage}"
MAX_AGE_SECONDS="${MAX_AGE_SECONDS:-28800}"

for command_name in find python3 restic sort; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "required command not found: $command_name" >&2
    exit 69
  fi
done

if [[ ! "$MAX_AGE_SECONDS" =~ ^[0-9]+$ ]] || (( MAX_AGE_SECONDS < 1 )); then
  echo 'MAX_AGE_SECONDS must be a positive integer' >&2
  exit 64
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "configuration file not found: $CONFIG_FILE" >&2
  exit 78
fi

set -a
source "$CONFIG_FILE"
set +a

latest_file_epoch() {
  local directory="$1"
  local pattern="$2"
  local timestamp
  timestamp="$(find "$directory" -maxdepth 1 -type f -name "$pattern" -printf '%T@\n' | sort -nr | head -n 1)"
  if [[ -z "$timestamp" ]]; then
    echo "no backup found in $directory" >&2
    exit 65
  fi
  printf '%s\n' "${timestamp%%.*}"
}

check_age() {
  local label="$1"
  local timestamp="$2"
  local now age
  now="$(date +%s)"
  age="$((now - timestamp))"
  if (( age < 0 || age > MAX_AGE_SECONDS )); then
    echo "$label backup is stale: ${age}s" >&2
    exit 1
  fi
  echo "$label backup age: ${age}s"
}

postgres_epoch="$(latest_file_epoch "$POSTGRES_BACKUP_DIR" 'airmovebr-*.dump')"
storage_epoch="$(latest_file_epoch "$STORAGE_BACKUP_DIR" 'airmovebr-storage-*.tar.gz')"
external_epoch="$(
  restic snapshots --latest 1 --json | python3 -c '
import datetime, json, sys
snapshots = json.load(sys.stdin)
if not snapshots:
    raise SystemExit("no external snapshots found")
value = snapshots[0]["time"].replace("Z", "+00:00")
print(int(datetime.datetime.fromisoformat(value).timestamp()))
'
)"

check_age 'PostgreSQL' "$postgres_epoch"
check_age 'storage' "$storage_epoch"
check_age 'external' "$external_epoch"
echo 'BACKUP HEALTH PASS'
