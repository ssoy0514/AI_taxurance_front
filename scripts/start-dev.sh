#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common-node16.sh"

export NODE_ENV=development
export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-5200}"
export NODE16_BIN PM2_LOG_DIR

APP_NAME="fcai-dev"
ECOSYSTEM="$PROJECT_ROOT/ecosystem.dev.config.js"

echo "[DEV] starting $APP_NAME on ${HOST}:${PORT}"

# pm2 프로세스 상태 확인
if "$PM2_BIN" list | grep -q " $APP_NAME "; then
  echo "[PM2] $APP_NAME found → restarting"
  "$PM2_BIN" restart "$APP_NAME"
else
  echo "[PM2] $APP_NAME not found → starting ecosystem"
  "$PM2_BIN" start "$ECOSYSTEM" --only "$APP_NAME"
fi

"$PM2_BIN" status "$APP_NAME"
