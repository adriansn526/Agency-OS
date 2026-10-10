#!/bin/bash
# Supplier price & stock sync (PRICELIST + OUTOFSTOCK from the supplier FTP, repricing at the BNR rate).
#
# The supplier regenerates its files around 04:23 Romanian time (01:23 UTC), so the feed job starts at 05:00 and then retries
# every 2 hours until 13:00: a run with unchanged files is a cheap no-op, the first one after regeneration does the work.
# The BNR rate is published on working days around 13:00, so the reprice job runs at 13:30 and 15:30 (no-op once applied).
#
# Install (as the app user; needs COMMERCE_FTP_PASSWORD in apps/web/.env.local or the environment):
#   (crontab -l 2>/dev/null; cat <<'CRON'
#   CRON_TZ=Europe/Bucharest
#   0 5-13/2 * * * /home/asns/projects/AdvancedSystems/agency-os/apps/web/scripts/commerce/sync-supplier-cron.sh feed
#   30 13,15 * * 1-5 /home/asns/projects/AdvancedSystems/agency-os/apps/web/scripts/commerce/sync-supplier-cron.sh reprice
#   CRON
#   ) | crontab -
set -euo pipefail
JOB="${1:?usage: sync-supplier-cron.sh feed|reprice}"
case "$JOB" in feed|reprice) ;; *) echo "unknown job: $JOB" >&2; exit 2 ;; esac
cd "$(dirname "$0")/../.."
LOG_DIR="${COMMERCE_SYNC_LOG_DIR:-$HOME/data/ecaroseria-feed/logs}"
mkdir -p "$LOG_DIR"
exec 9>"$LOG_DIR/.sync-$JOB.lock"
flock -n 9 || { echo "$(date -Is) $JOB already running" >> "$LOG_DIR/cron.log"; exit 0; }
{
  echo "=== $(date -Is) $JOB start"
  timeout 3000 npx tsx --env-file=.env.local scripts/commerce/sync-supplier.ts --job="$JOB" || echo "exit code $?"
  echo "=== $(date -Is) $JOB end"
} >> "$LOG_DIR/cron.log" 2>&1
