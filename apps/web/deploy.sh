#!/bin/bash
# ═══════════════════════════════════════════════════════
# Agency OS — Deploy Script
# Builds and deploys the production server on port 3100
# Usage: ./deploy.sh
# ═══════════════════════════════════════════════════════

set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=3100
LOG_FILE="/tmp/agency-os-prod.log"
BUILD_LOG="/tmp/agency-os-build.log"

echo ""
echo "🚀 Agency OS Deploy"
echo "═══════════════════════════════════════"

# 1. Stop running production server
echo "⏹️  Stopping current server..."
screen -S agency-os -X quit 2>/dev/null || true
pkill -f "next start.*${PORT}" 2>/dev/null || true
pkill -f "next-server.*${PORT}" 2>/dev/null || true
fuser -k ${PORT}/tcp 2>/dev/null || true
sleep 3

# 2. Clean old build
echo "🧹 Cleaning old build..."
rm -rf "${APP_DIR}/.next"
echo "   ✓ .next/ removed"

# 3. Build
echo "🔨 Building production (webpack)..."
echo "   Build log: ${BUILD_LOG}"

cd "${APP_DIR}"
NODE_OPTIONS="--max-old-space-size=8192" npx next build --webpack > "${BUILD_LOG}" 2>&1
BUILD_EXIT=$?

if [ ${BUILD_EXIT} -ne 0 ] || [ ! -f "${APP_DIR}/.next/BUILD_ID" ]; then
  echo ""
  echo "❌ Build FAILED! (exit: ${BUILD_EXIT})"
  echo "   Check: tail -30 ${BUILD_LOG}"
  exit 1
fi

echo "   ✓ Build completed (exit: ${BUILD_EXIT})"

# 4. Start production server via screen (persistent session)
echo "🟢 Starting production server on port ${PORT} via screen..."
screen -dmS agency-os bash -c "cd ${APP_DIR} && npx next start --port ${PORT} --hostname 0.0.0.0 2>&1 | tee ${LOG_FILE}"

# 5. Wait for server to be ready
echo -n "   Waiting for server"
for i in $(seq 1 30); do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:${PORT}/login 2>/dev/null)
  if [ "${HTTP}" = "200" ] || [ "${HTTP}" = "307" ]; then
    SERVER_PID=$(ss -tlnp | grep ":${PORT}" | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2)
    echo ""
    echo "   ✓ Server ready (PID: ${SERVER_PID})"
    break
  fi
  echo -n "."
  sleep 2
done

echo ""
echo "═══════════════════════════════════════"
echo "✅ Deploy SUCCESS"
echo "   URL:   https://admin.asns.ro"
echo "   Local: http://localhost:${PORT}"
echo "   Screen: screen -r agency-os"
echo "   Log:   ${LOG_FILE}"
echo "═══════════════════════════════════════"
