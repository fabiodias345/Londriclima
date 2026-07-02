#!/usr/bin/env bash
set -euo pipefail

CONFIG_DIR="${CONFIG_DIR:-/etc/airmovebr}"
ENV_FILE="$CONFIG_DIR/backblaze.env"
PASSWORD_FILE="$CONFIG_DIR/restic-password"

read -r -p 'Backblaze Key ID: ' key_id
read -r -s -p 'Backblaze Application Key: ' application_key
printf '\n'
read -r -s -p 'Restic recovery password (minimum 24 characters): ' recovery_password
printf '\n'
read -r -s -p 'Confirm recovery password: ' recovery_password_confirmation
printf '\n'

trim_whitespace() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

key_id="$(trim_whitespace "$key_id")"
application_key="$(trim_whitespace "$application_key")"

if [[ -z "$key_id" ]]; then
  echo 'Backblaze Key ID cannot be empty' >&2
  exit 64
fi

if [[ -z "$application_key" ]]; then
  echo 'Backblaze Application Key cannot be empty' >&2
  exit 64
fi

if (( ${#recovery_password} < 24 )); then
  echo 'Restic recovery password must contain at least 24 characters' >&2
  exit 64
fi

if [[ "$recovery_password" != "$recovery_password_confirmation" ]]; then
  echo 'Restic recovery passwords do not match' >&2
  exit 64
fi

umask 077
install -d -m 0700 "$CONFIG_DIR"
temporary_env="$(mktemp "$CONFIG_DIR/.backblaze.env.XXXXXX")"
temporary_password="$(mktemp "$CONFIG_DIR/.restic-password.XXXXXX")"

cleanup() {
  rm -f -- "$temporary_env" "$temporary_password"
}
trap cleanup EXIT

{
  printf 'AWS_ACCESS_KEY_ID=%q\n' "$key_id"
  printf 'AWS_SECRET_ACCESS_KEY=%q\n' "$application_key"
  printf 'RESTIC_REPOSITORY=%q\n' 's3:s3.us-east-005.backblazeb2.com/londriclima-storage/restic'
  printf 'RESTIC_PASSWORD_FILE=%q\n' "$PASSWORD_FILE"
  printf 'RESTIC_CACHE_DIR=%q\n' '/var/cache/airmovebr-restic'
} > "$temporary_env"
printf '%s\n' "$recovery_password" > "$temporary_password"

chmod 0600 "$temporary_env" "$temporary_password"
mv -- "$temporary_env" "$ENV_FILE"
mv -- "$temporary_password" "$PASSWORD_FILE"

echo "Backblaze configuration saved in $ENV_FILE"
echo 'Keep the Restic recovery password in an external password manager.'
