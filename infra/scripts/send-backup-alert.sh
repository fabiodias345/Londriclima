#!/usr/bin/env bash
set -euo pipefail

PRODUCTION_ENV_FILE="${PRODUCTION_ENV_FILE:-/opt/airmovebr/repo/.env.production}"
failed_unit="${1:-unknown-backup-unit}"

if [[ ! -f "$PRODUCTION_ENV_FILE" ]]; then
  echo "production environment not found: $PRODUCTION_ENV_FILE" >&2
  exit 78
fi

read_env() {
  local key="$1"
  local value
  value="$(sed -n "s/^${key}=//p" "$PRODUCTION_ENV_FILE" | tail -n 1)"
  value="${value%$'\r'}"
  if [[ "$value" == \"*\" ]] || [[ "$value" == \'*\' ]]; then
    value="${value:1:${#value}-2}"
  fi
  printf '%s' "$value"
}

curl_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

smtp_host="$(read_env SMTP_HOST)"
smtp_port="$(read_env SMTP_PORT)"
smtp_user="$(read_env SMTP_USER)"
smtp_pass="$(read_env SMTP_PASS)"
smtp_secure="$(read_env SMTP_SECURE)"
smtp_starttls="$(read_env SMTP_STARTTLS)"
recipient="$(read_env BACKUP_ALERT_EMAIL)"
recipient="${recipient:-$(read_env PMOC_INTERNAL_COPY_EMAIL)}"
recipient="${recipient:-$smtp_user}"

for value_name in smtp_host smtp_port smtp_user smtp_pass recipient; do
  if [[ -z "${!value_name}" ]]; then
    echo "SMTP configuration is empty: $value_name" >&2
    exit 78
  fi
done

umask 077
message_file="$(mktemp)"
curl_config="$(mktemp)"
cleanup() {
  rm -f -- "$message_file" "$curl_config"
}
trap cleanup EXIT

timestamp="$(date --iso-8601=seconds)"
printf 'From: %s\r\nTo: %s\r\nSubject: [AIRMOVEBR] Falha no backup\r\n\r\nUnidade: %s\r\nData: %s\r\nVerifique a VM Locaweb.\r\n' \
  "$smtp_user" "$recipient" "$failed_unit" "$timestamp" > "$message_file"

scheme='smtp'
if [[ "${smtp_secure,,}" == 'true' ]]; then
  scheme='smtps'
fi

{
  printf 'url = "%s://%s:%s"\n' "$scheme" "$(curl_escape "$smtp_host")" "$(curl_escape "$smtp_port")"
  printf 'user = "%s:%s"\n' "$(curl_escape "$smtp_user")" "$(curl_escape "$smtp_pass")"
  printf 'mail-from = "%s"\n' "$(curl_escape "$smtp_user")"
  printf 'mail-rcpt = "%s"\n' "$(curl_escape "$recipient")"
  printf 'upload-file = "%s"\n' "$(curl_escape "$message_file")"
  printf 'silent\nshow-error\nfail\n'
  if [[ "$scheme" == 'smtp' && "${smtp_starttls,,}" == 'true' ]]; then
    printf 'ssl-reqd\n'
  fi
} > "$curl_config"

curl --config "$curl_config"
echo "backup alert sent for $failed_unit"
