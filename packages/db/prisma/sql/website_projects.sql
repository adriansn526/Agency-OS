-- Website module: child entries (a firm's portfolio projects). Purely additive and idempotent. Applied manually:
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os -v ON_ERROR_STOP=1 < packages/db/prisma/sql/website_projects.sql
-- Apply BEFORE deploying code that reads the column.
-- Rollback: ALTER TABLE "WebsiteEntry" DROP COLUMN "parentId";
BEGIN;
ALTER TABLE "WebsiteEntry" ADD COLUMN IF NOT EXISTS "parentId" TEXT;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteEntry_parentId_fkey') THEN
    ALTER TABLE "WebsiteEntry" ADD CONSTRAINT "WebsiteEntry_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WebsiteEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "WebsiteEntry_parentId_idx" ON "WebsiteEntry"("parentId");
COMMIT;
