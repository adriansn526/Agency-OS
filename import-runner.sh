export DATABASE_URL="postgresql://agency_os:AgencyOS_2026!Secure@localhost:5434/agency_os?schema=public"
echo "Ștergem lead-urile vechi incomplete..."
psql "$DATABASE_URL" -c "DELETE FROM \"Lead\" WHERE source = 'csv_import';"
echo "Pornim importul complet (cu toate campurile json customFields)..."
npx tsx packages/db/prisma/import-csv-leads.ts
