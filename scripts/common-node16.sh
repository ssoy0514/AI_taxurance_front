#!/usr/bin/env bash
set -euo pipefail

# === Node16 바이너리 경로 (환경에 맞게 수정) ===
export NODE16_BIN="/APP/bin/node-v16.20.2-linux-x64/bin"

# 프로젝트 루트
export PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Node16을 PATH 최우선으로
export PATH="$NODE16_BIN:$PATH"

# 로컬 pm2 실행 파일
export PM2_BIN="$PROJECT_ROOT/node_modules/.bin/pm2"

# pm2 로그 디렉토리(원하면 변경)
export PM2_LOG_DIR="${PM2_LOG_DIR:-$PROJECT_ROOT/.logs}"
mkdir -p "$PM2_LOG_DIR"

echo "[ENV] node: $(node -v || true)"
echo "[ENV] npm : $(npm -v || true)"
echo "[ENV] pm2 : $($PM2_BIN -v 2>/dev/null || echo 'local pm2 not installed')"
