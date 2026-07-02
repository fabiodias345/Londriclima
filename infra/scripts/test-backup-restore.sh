#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="${CONFIG_FILE:-/etc/airmovebr/backblaze.env}"
RESTORE_ROOT="${RESTORE_ROOT:-/var/tmp}"
container_name="airmovebr-restore-test-$$"
work_dir=''

cleanup() {
  docker rm -f "$container_name" >/dev/null 2>&1 || true
  if [[ -n "$work_dir" && -d "$work_dir" ]]; then
    rm -rf -- "$work_dir"
  fi
}
trap cleanup EXIT

for command_name in docker find restic sha256sum sort tar; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "required command not found: $command_name" >&2
    exit 69
  fi
done

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "configuration file not found: $CONFIG_FILE" >&2
  exit 78
fi

set -a
source "$CONFIG_FILE"
set +a

umask 077
work_dir="$(mktemp -d "$RESTORE_ROOT/airmovebr-restore.XXXXXX")"
restic restore latest --target "$work_dir"

postgres_dir="$work_dir/var/backups/airmovebr/postgres"
storage_dir="$work_dir/var/backups/airmovebr/storage"

for directory in "$postgres_dir" "$storage_dir"; do
  while IFS= read -r -d '' checksum_file; do
    (cd "$directory" && sha256sum --check --status "$(basename "$checksum_file")")
  done < <(find "$directory" -maxdepth 1 -type f -name '*.sha256' -print0)
done

latest_dump="$(find "$postgres_dir" -maxdepth 1 -type f -name 'airmovebr-*.dump' -printf '%T@ %p\n' | sort -nr | head -n 1 | cut -d' ' -f2-)"
latest_storage="$(find "$storage_dir" -maxdepth 1 -type f -name 'airmovebr-storage-*.tar.gz' -printf '%T@ %p\n' | sort -nr | head -n 1 | cut -d' ' -f2-)"

if [[ -z "$latest_dump" || -z "$latest_storage" ]]; then
  echo 'restored snapshot does not contain required backups' >&2
  exit 65
fi

docker run -d --name "$container_name" \
  --tmpfs /var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=restore-test-only \
  postgres:16-alpine > /dev/null

ready='false'
for _ in {1..30}; do
  if docker exec "$container_name" sh -c 'test "$(cat /proc/1/comm)" = postgres' \
    && docker exec "$container_name" pg_isready -U postgres > /dev/null 2>&1; then
    ready='true'
    break
  fi
  sleep 1
done
if [[ "$ready" != 'true' ]]; then
  echo 'isolated PostgreSQL did not become ready' >&2
  exit 70
fi

docker exec -i "$container_name" pg_restore \
  --username postgres --dbname postgres --no-owner --no-privileges \
  < "$latest_dump"

database_counts="$(docker exec "$container_name" psql -U postgres -d postgres -Atc \
  "select (select count(*) from empresas), (select count(*) from clientes), (select count(*) from equipamentos), (select count(*) from usuarios), (select count(*) from ordens_servico);")"

files_dir="$work_dir/restored-files"
install -d -m 0700 "$files_dir"
tar --extract --gzip --file "$latest_storage" --directory "$files_dir"
file_count="$(find "$files_dir" -type f | wc -l)"
if (( file_count < 1 )); then
  echo 'storage archive restored no files' >&2
  exit 65
fi

echo "RESTORE TEST PASS database_counts=$database_counts storage_files=$file_count"
