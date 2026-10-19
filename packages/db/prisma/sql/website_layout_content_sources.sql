-- The block editor of the service and price pages (lib/website/content) writes versions with source 'staff' and the seeds with 'seed';
-- the original constraint only allowed the partner editor's values. Idempotent. Applied manually, BEFORE using the block editor / seed-services:
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os -v ON_ERROR_STOP=1 < packages/db/prisma/sql/website_layout_content_sources.sql
-- Rollback: restore the three-value constraint (delete 'staff'/'seed' rows first).
BEGIN;
ALTER TABLE "WebsiteLayoutVersion" DROP CONSTRAINT IF EXISTS "WebsiteLayoutVersion_source_check";
ALTER TABLE "WebsiteLayoutVersion" ADD CONSTRAINT "WebsiteLayoutVersion_source_check" CHECK ("source" IN ('partner', 'restore', 'reset', 'staff', 'seed'));
COMMIT;
