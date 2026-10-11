#!/bin/bash
# Daily refresh of partner coordinates (Google values expire after 30 days; OSM fallback). Safe to run with no partners (no-op).
# Install (as the app user):
#   (crontab -l 2>/dev/null; echo '15 6 * * * /home/asns/projects/AdvancedSystems/agency-os/apps/web/scripts/commerce/refresh-partner-coords-cron.sh') | crontab -
set -euo pipefail
# cron starts with a minimal PATH: node/npx live under nvm
export PATH="/home/asns/.nvm/versions/node/v20.19.5/bin:/usr/local/bin:/usr/bin:/bin"
cd "$(dirname "$0")/../.."
LOG_DIR="${COMMERCE_SYNC_LOG_DIR:-$HOME/data/ecaroseria-feed/logs}"
mkdir -p "$LOG_DIR"
exec 9>"$LOG_DIR/.partner-coords.lock"
flock -n 9 || { echo "$(date -Is) already running" >> "$LOG_DIR/partner-coords.log"; exit 0; }
{
  echo "=== $(date -Is) start"
  timeout 600 npx tsx --env-file=.env.local scripts/commerce/refresh-partner-coords.ts | tr -d '\n ' ; echo
  echo "=== $(date -Is) end"
} >> "$LOG_DIR/partner-coords.log" 2>&1
