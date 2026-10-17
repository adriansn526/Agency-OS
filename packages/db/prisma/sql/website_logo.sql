-- Website module: company logo on WebsiteEntry. Purely additive and idempotent. Applied manually:
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os -v ON_ERROR_STOP=1 < packages/db/prisma/sql/website_logo.sql
-- Rollback: ALTER TABLE "WebsiteEntry" DROP COLUMN "logoUrl";
ALTER TABLE "WebsiteEntry" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
