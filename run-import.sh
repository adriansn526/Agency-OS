: "${DATABASE_URL:?export DATABASE_URL first (see apps/web/.env.local)}"
export DATABASE_URL
echo "Ștergem lead-urile incomplete..."
psql "$DATABASE_URL" -c "DELETE FROM \"Lead\" WHERE source = 'csv_import';"
echo "Pornim importul complet..."
npx tsx packages/db/prisma/import-csv-leads.ts
