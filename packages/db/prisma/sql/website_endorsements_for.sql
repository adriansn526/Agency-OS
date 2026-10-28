-- Doctor endorsements: what the endorser recommends the colleague FOR (taxonomy slugs of `servicii`, optional, default none).
-- Purely additive and idempotent. Applied manually (CI only runs `prisma generate`):
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os -v ON_ERROR_STOP=1 < packages/db/prisma/sql/website_endorsements_for.sql
-- Requires website_endorsements.sql. Apply BEFORE deploying code that reads or writes this column.
-- Rollback: ALTER TABLE "WebsiteEndorsement" DROP COLUMN "forServicii";

ALTER TABLE "WebsiteEndorsement" ADD COLUMN IF NOT EXISTS "forServicii" JSONB NOT NULL DEFAULT '[]';
