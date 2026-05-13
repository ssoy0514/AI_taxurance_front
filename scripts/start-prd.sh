#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common-node16.sh"

export NODE_ENV=production
export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-5200}"
export NODE16_BIN PM2_LOG_DIR
export NODE_EXTRA_CA_CERTS=/APP/bin/httpd-2.4.6-fcai/conf/fc/ssl/ca_bundle.pem

APP_NAME="fcai-prd"
ECOSYSTEM="$PROJECT_ROOT/ecosystem.prd.config.js"

echo "[DEBUG] PROJECT_ROOT=$PROJECT_ROOT"
cd "$PROJECT_ROOT"

echo "[PRD] Cleaning previous build artifacts..."
rm -rf .nuxt dist

echo "[PRD] building Nuxt app..."
npm run build

echo "[PRD] starting $APP_NAME on ${HOST}:${PORT}"

if "$PM2_BIN" list | grep -q " $APP_NAME "; then
  echo "[PM2] $APP_NAME found → restarting"
  "$PM2_BIN" restart "$APP_NAME"
else
  echo "[PM2] $APP_NAME not found → starting ecosystem"
  "$PM2_BIN" start "$ECOSYSTEM" --only "$APP_NAME"
fi

"$PM2_BIN" status "$APP_NAME"
