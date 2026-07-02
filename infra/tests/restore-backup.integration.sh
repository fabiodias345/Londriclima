#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/scripts/test-backup-restore.sh}"
output="$(bash "$SCRIPT_PATH")"
grep -q '^RESTORE TEST PASS ' <<< "$output"
echo 'restore-backup.integration.sh: PASS'
