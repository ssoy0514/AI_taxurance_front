#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common-node16.sh"

"$PM2_BIN" stop fcai-qa || true
"$PM2_BIN" delete fcai-qa || true
"$PM2_BIN" save || true
