#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/scripts/configure-backblaze.sh}"
TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT

key_id='0123456789abcdef012345'
application_key='application+key/0123456789=abc$xyz'
recovery_password='recovery-password-with-32-characters'

output="$({
  printf '  %s\r\n' "$key_id"
  printf '  %s  \r\n' "$application_key"
  printf '%s\n' "$recovery_password"
  printf '%s\n' "$recovery_password"
} | CONFIG_DIR="$TEST_DIR/config" bash "$SCRIPT_PATH" 2>&1)"

test -f "$TEST_DIR/config/backblaze.env"
test -f "$TEST_DIR/config/restic-password"
test "$(stat -c '%a' "$TEST_DIR/config/backblaze.env")" = '600'
test "$(stat -c '%a' "$TEST_DIR/config/restic-password")" = '600'
grep -q "^AWS_ACCESS_KEY_ID=$key_id$" "$TEST_DIR/config/backblaze.env"
grep -q '^RESTIC_REPOSITORY=s3:s3.us-east-005.backblazeb2.com/londriclima-storage/restic$' "$TEST_DIR/config/backblaze.env"
grep -q '^RESTIC_PASSWORD_FILE=.*/restic-password$' "$TEST_DIR/config/backblaze.env"
grep -q "^$recovery_password$" "$TEST_DIR/config/restic-password"
set -a
source "$TEST_DIR/config/backblaze.env"
set +a
test "$AWS_ACCESS_KEY_ID" = "$key_id"
test "$AWS_SECRET_ACCESS_KEY" = "$application_key"
if grep -q "$application_key" <<< "$output"; then
  echo 'application key leaked to output' >&2
  exit 1
fi

echo 'configure-backblaze.test.sh: PASS'
