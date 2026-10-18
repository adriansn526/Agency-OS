-- Website module: founding-partner places (limited per county × service category). Purely additive and idempotent. Applied manually:
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os -v ON_ERROR_STOP=1 < packages/db/prisma/sql/website_founding.sql
-- Apply BEFORE deploying code that reads the table.
-- Rollback: DROP TABLE "WebsiteFoundingSlot";
BEGIN;
CREATE TABLE IF NOT EXISTS "WebsiteFoundingSlot" (
  "id"             TEXT         NOT NULL,
  "businessLineId" TEXT         NOT NULL,
  "entryId"        TEXT         NOT NULL,
  "county"         TEXT         NOT NULL,
  "category"       TEXT         NOT NULL,
  "claimedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockUntil"      TIMESTAMP(3),
  CONSTRAINT "WebsiteFoundingSlot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsiteFoundingSlot_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "WebsiteEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "WebsiteFoundingSlot_entryId_county_category_key" ON "WebsiteFoundingSlot"("entryId", "county", "category");
CREATE INDEX IF NOT EXISTS "WebsiteFoundingSlot_businessLineId_county_category_idx" ON "WebsiteFoundingSlot"("businessLineId", "county", "category");
COMMIT;
