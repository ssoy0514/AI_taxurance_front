#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common-node16.sh"

"$PM2_BIN" stop fcai-dev || true
"$PM2_BIN" delete fcai-dev || true
"$PM2_BIN" save || true
