-- Website module: configurable home page blocks per firm, with version history. Purely additive and idempotent. Applied manually:
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os -v ON_ERROR_STOP=1 < packages/db/prisma/sql/website_layout.sql
-- Apply BEFORE deploying code that reads these columns.
-- Rollback: DROP TABLE "WebsiteLayoutVersion"; ALTER TABLE "WebsiteEntry" DROP COLUMN "layout";
BEGIN;
ALTER TABLE "WebsiteEntry" ADD COLUMN IF NOT EXISTS "layout" JSONB;
CREATE TABLE IF NOT EXISTS "WebsiteLayoutVersion" (
  "id"        TEXT         NOT NULL,
  "entryId"   TEXT         NOT NULL,
  "layout"    JSONB        NOT NULL,
  "source"    TEXT         NOT NULL DEFAULT 'partner',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteLayoutVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsiteLayoutVersion_source_check" CHECK ("source" IN ('partner', 'restore', 'reset')),
  CONSTRAINT "WebsiteLayoutVersion_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "WebsiteEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "WebsiteLayoutVersion_entryId_createdAt_idx" ON "WebsiteLayoutVersion"("entryId", "createdAt");
COMMIT;
