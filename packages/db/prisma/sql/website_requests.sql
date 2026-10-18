-- Quote requests (cereri de ofertă) routed to partner firms, plus the firm's plan (gratuit / abonament).
-- Purely additive and idempotent. Applied manually (CI only runs `prisma generate`):
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os -v ON_ERROR_STOP=1 < packages/db/prisma/sql/website_requests.sql
-- Requires website_module.sql. Apply BEFORE deploying code that reads these tables.
-- Rollback (destroys requests): DROP TABLE "WebsiteRequestDelivery", "WebsiteRequest"; ALTER TABLE "WebsiteEntry" DROP COLUMN "plan", DROP COLUMN "planUntil";
BEGIN;

ALTER TABLE "WebsiteEntry" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'gratuit';
ALTER TABLE "WebsiteEntry" ADD COLUMN IF NOT EXISTS "planUntil" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "WebsiteRequest" (
  "id"              TEXT         NOT NULL,
  "businessLineId"  TEXT         NOT NULL,
  "type"            TEXT         NOT NULL,                 -- direct (from a firm profile) | general (from a service page)
  "directEntryId"   TEXT,                                  -- the firm of a direct request
  "category"        TEXT         NOT NULL,                 -- glossary category slug
  "county"          TEXT         NOT NULL,
  "city"            TEXT,
  "description"     TEXT         NOT NULL,
  "budgetRon"       INTEGER,
  "urgency"         TEXT,
  "customerName"    TEXT         NOT NULL,
  "customerEmail"   TEXT         NOT NULL,
  "customerPhone"   TEXT         NOT NULL,
  "maxAcceptances"  INTEGER      NOT NULL DEFAULT 1,
  "status"          TEXT         NOT NULL DEFAULT 'sent',  -- sent | unrouted | closed
  "routing"         JSONB,                                 -- rule used and candidates considered (audit)
  "sourcePage"      TEXT,
  "ipHash"          TEXT,
  "expiresAt"       TIMESTAMP(3) NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsiteRequest_type_check" CHECK ("type" IN ('direct', 'general'))
);
CREATE INDEX IF NOT EXISTS "WebsiteRequest_line_createdAt_idx" ON "WebsiteRequest"("businessLineId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "WebsiteRequest_email_createdAt_idx" ON "WebsiteRequest"("customerEmail", "createdAt");
CREATE INDEX IF NOT EXISTS "WebsiteRequest_phone_createdAt_idx" ON "WebsiteRequest"("customerPhone", "createdAt");

CREATE TABLE IF NOT EXISTS "WebsiteRequestDelivery" (
  "id"            TEXT         NOT NULL,
  "requestId"     TEXT         NOT NULL,
  "entryId"       TEXT         NOT NULL,
  "businessLineId" TEXT        NOT NULL,
  "status"        TEXT         NOT NULL DEFAULT 'sent',    -- sent | accepted | declined | expired | full
  "chargedRon"    DECIMAL(10,2),                           -- what the firm owes for this request (null = not decided yet)
  "chargeReason"  TEXT,                                    -- abonament | gratuit | tarif | livrare
  "sentAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt"   TIMESTAMP(3),
  CONSTRAINT "WebsiteRequestDelivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsiteRequestDelivery_status_check" CHECK ("status" IN ('sent', 'accepted', 'declined', 'expired', 'full'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "WebsiteRequestDelivery_request_entry_key" ON "WebsiteRequestDelivery"("requestId", "entryId");
CREATE INDEX IF NOT EXISTS "WebsiteRequestDelivery_entry_status_idx" ON "WebsiteRequestDelivery"("entryId", "status", "sentAt" DESC);
CREATE INDEX IF NOT EXISTS "WebsiteRequestDelivery_line_idx" ON "WebsiteRequestDelivery"("businessLineId", "sentAt" DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteRequest_businessLineId_fkey') THEN
    ALTER TABLE "WebsiteRequest" ADD CONSTRAINT "WebsiteRequest_businessLineId_fkey" FOREIGN KEY ("businessLineId") REFERENCES "BusinessLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteRequestDelivery_requestId_fkey') THEN
    ALTER TABLE "WebsiteRequestDelivery" ADD CONSTRAINT "WebsiteRequestDelivery_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "WebsiteRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteRequestDelivery_entryId_fkey') THEN
    ALTER TABLE "WebsiteRequestDelivery" ADD CONSTRAINT "WebsiteRequestDelivery_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "WebsiteEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
