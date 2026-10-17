-- Website module: allow status 'preview' on WebsiteEntry (the CHECK from website_module.sql only had draft | published | suspended).
-- Idempotent. Applied manually:
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os -v ON_ERROR_STOP=1 < packages/db/prisma/sql/website_preview_status.sql
-- Apply BEFORE seeding preview entries.
-- Rollback (fails if preview rows exist; delete or move them first):
--   ALTER TABLE "WebsiteEntry" DROP CONSTRAINT "WebsiteEntry_status_check";
--   ALTER TABLE "WebsiteEntry" ADD CONSTRAINT "WebsiteEntry_status_check" CHECK ("status" IN ('draft', 'published', 'suspended'));

BEGIN;
ALTER TABLE "WebsiteEntry" DROP CONSTRAINT IF EXISTS "WebsiteEntry_status_check";
ALTER TABLE "WebsiteEntry" ADD CONSTRAINT "WebsiteEntry_status_check" CHECK ("status" IN ('draft', 'preview', 'published', 'suspended'));
COMMIT;
