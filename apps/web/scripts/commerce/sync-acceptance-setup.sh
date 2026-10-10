#!/bin/bash
# (Re)build the throw-away database "agency_os_synctest" as a copy of the real one (read-only on the source),
# with the supplier-sync DDL applied, for scripts/commerce/sync-acceptance.ts. Never touches the real database.
set -euo pipefail
cd "$(dirname "$0")/../.."
set -a; . ./.env.local; set +a
SRC="${DATABASE_URL%%\?*}"; BASE="${SRC%/*}"; DST="$BASE/agency_os_synctest"
psql "$SRC" -X -q -c 'drop database if exists agency_os_synctest' -c 'create database agency_os_synctest'
pg_dump --no-owner --no-privileges "$SRC" | psql -X -q "$DST" > /dev/null
psql "$DST" -X -q -v ON_ERROR_STOP=1 -f ../../packages/db/prisma/sql/commerce_supplier_sync.sql
echo "ready: $(psql "$DST" -X -At -c 'select count(*) from "CommerceProduct"') products in agency_os_synctest"
echo "next: DATABASE_URL=<same server>/agency_os_synctest npx tsx scripts/commerce/sync-acceptance.ts <scratchDir>"
