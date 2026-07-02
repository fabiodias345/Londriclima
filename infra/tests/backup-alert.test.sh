#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/scripts/send-backup-alert.sh}"
TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT

mkdir -p "$TEST_DIR/bin"
cat > "$TEST_DIR/bin/curl" <<'CURL'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" > "$CURL_TEST_ARGS"
while (( $# > 0 )); do
  if [[ "$1" == '--config' ]]; then
    cp "$2" "$CURL_TEST_CONFIG"
    message_file="$(sed -n 's/^upload-file = "\(.*\)"$/\1/p' "$2")"
    cp "$message_file" "$CURL_TEST_MESSAGE"
    break
  fi
  shift
done
CURL
chmod +x "$TEST_DIR/bin/curl"

cat > "$TEST_DIR/production.env" <<'EOF'
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_STARTTLS=true
SMTP_USER=alerts@example.com
SMTP_PASS=test-password
PMOC_INTERNAL_COPY_EMAIL=owner@example.com
EOF

export CURL_TEST_ARGS="$TEST_DIR/curl.args"
export CURL_TEST_CONFIG="$TEST_DIR/curl.config"
export CURL_TEST_MESSAGE="$TEST_DIR/message.txt"
PATH="$TEST_DIR/bin:$PATH" \
PRODUCTION_ENV_FILE="$TEST_DIR/production.env" \
bash "$SCRIPT_PATH" 'airmovebr-backup-health.service'

grep -q '^mail-rcpt = "owner@example.com"$' "$TEST_DIR/curl.config"
grep -q '^Subject: \[AIRMOVEBR\] Falha no backup' "$TEST_DIR/message.txt"
grep -q 'airmovebr-backup-health.service' "$TEST_DIR/message.txt"
if grep -q 'test-password' "$TEST_DIR/message.txt"; then
  echo 'SMTP password leaked to message' >&2
  exit 1
fi

echo 'backup-alert.test.sh: PASS'
