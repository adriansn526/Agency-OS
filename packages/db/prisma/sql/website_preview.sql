-- Website module: private profile previews for partner outreach (status 'preview').
-- Purely additive and idempotent. Applied manually (CI only runs `prisma generate`):
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os -v ON_ERROR_STOP=1 < packages/db/prisma/sql/website_preview.sql
-- Apply BEFORE deploying code that reads these columns.
-- Rollback:
--   ALTER TABLE "WebsiteEntry" DROP COLUMN "previewTokenHash", DROP COLUMN "previewSentAt", DROP COLUMN "previewExpiresAt";

BEGIN;

-- The token is generated when the preview is SENT (the expiry clock starts then, default 14 days, set in the UI); only its sha256 is stored.
ALTER TABLE "WebsiteEntry" ADD COLUMN IF NOT EXISTS "previewTokenHash"  TEXT;
ALTER TABLE "WebsiteEntry" ADD COLUMN IF NOT EXISTS "previewSentAt"     TIMESTAMP(3);
ALTER TABLE "WebsiteEntry" ADD COLUMN IF NOT EXISTS "previewExpiresAt"  TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "WebsiteEntry_previewTokenHash_key" ON "WebsiteEntry"("previewTokenHash");
CREATE INDEX IF NOT EXISTS "WebsiteEntry_status_previewExpiresAt_idx" ON "WebsiteEntry"("status", "previewExpiresAt");

COMMIT;
