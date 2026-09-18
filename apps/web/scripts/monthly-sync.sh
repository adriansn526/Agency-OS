#!/bin/bash
# Script care preia facturile din Gmail, extrasele din Gmail și facturile din e-Factura (SPV ANAF).

LOG_FILE="/var/log/agency-os-monthly-sync.log"
echo "=== Începere sincronizare documente (Data: $(date)) ===" >> "$LOG_FILE"

cd /home/asns/projects/AdvancedSystems/agency-os/apps/web

echo "-> 1. Preluare facturi din Gmail..." >> "$LOG_FILE"
npx dotenv-cli -e .env.local -- npx tsx scripts/fetch-gmail-invoices.ts >> "$LOG_FILE" 2>&1

echo "-> 2. Preluare extrase de cont din Gmail..." >> "$LOG_FILE"
npx dotenv-cli -e .env.local -- npx tsx scripts/fetch-gmail-statements.ts >> "$LOG_FILE" 2>&1

echo "-> 3. Sincronizare facturi din SPV ANAF..." >> "$LOG_FILE"
CRON_SECRET=$(grep "^CRON_SECRET=" .env.local | cut -d '=' -f2 | tr -d '\r')
curl -s -X POST https://admin.asns.ro/api/accounting/spv/sync \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"days": 35}' >> "$LOG_FILE" 2>&1

echo -e "\n=== Sincronizare finalizată (Data: $(date)) ===\n" >> "$LOG_FILE"
