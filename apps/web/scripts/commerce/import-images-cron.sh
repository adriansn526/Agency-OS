#!/bin/bash
# Nightly import of product image references (read-only on the bucket). Install (as the app user):
#   (crontab -l 2>/dev/null; echo '30 3 * * * /home/asns/projects/AdvancedSystems/agency-os/apps/web/scripts/commerce/import-images-cron.sh') | crontab -
set -euo pipefail
cd "$(dirname "$0")/../.."
LOG_DIR="${COMMERCE_IMAGES_REPORT_DIR:-$HOME/commerce-image-reports}"
mkdir -p "$LOG_DIR"
exec 9>"$LOG_DIR/.import.lock"
flock -n 9 || { echo "$(date -Is) import already running" >> "$LOG_DIR/cron.log"; exit 0; }
{
  echo "=== $(date -Is) start"
  npx tsx --env-file=.env.local scripts/commerce/import-images.ts | grep -E '"(durationMs|partsFiles|matchedFiles|filesWithoutProduct|filesBadPattern|filesNonUtf8|productsWithImage|productsWithoutImage|inserted|updated|removed|flaggedMissing)"|FAILED' || true
  echo "=== $(date -Is) end"
} >> "$LOG_DIR/cron.log" 2>&1
