-- Doctor-to-doctor endorsements ("recomandări între medici") of the Website module.
-- Purely additive and idempotent. Applied manually (CI only runs `prisma generate`):
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os -v ON_ERROR_STOP=1 < packages/db/prisma/sql/website_endorsements.sql
-- Requires website_module.sql. Apply BEFORE deploying code that reads this table.
-- Rollback (destroys the endorsements): DROP TABLE "WebsiteEndorsement";

BEGIN;

CREATE TABLE IF NOT EXISTS "WebsiteEndorsement" (
  "id"            TEXT         NOT NULL,
  "businessLineId" TEXT        NOT NULL,
  "endorserId"    TEXT         NOT NULL,                  -- the doctor who recommends (WebsiteEntry)
  "endorseeId"    TEXT         NOT NULL,                  -- the doctor who is recommended (WebsiteEntry)
  "note"          TEXT,                                   -- why, max 280 characters
  "showName"      BOOLEAN      NOT NULL DEFAULT false,    -- the endorser agreed to be named on the endorsee's public profile
  "sameClinic"    BOOLEAN      NOT NULL DEFAULT false,    -- computed when created: a shared clinic means the endorsement is not counted
  "status"        TEXT         NOT NULL DEFAULT 'active', -- active | withdrawn (by the endorser) | removed (by the team)
  "removedReason" TEXT,
  "endorsedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- last time it was (re)made: drives the monthly limit
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteEndorsement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsiteEndorsement_status_check" CHECK ("status" IN ('active', 'withdrawn', 'removed')),
  CONSTRAINT "WebsiteEndorsement_not_self_check" CHECK ("endorserId" <> "endorseeId"),
  CONSTRAINT "WebsiteEndorsement_note_check" CHECK ("note" IS NULL OR char_length("note") <= 280)
);
CREATE UNIQUE INDEX IF NOT EXISTS "WebsiteEndorsement_endorserId_endorseeId_key" ON "WebsiteEndorsement"("endorserId", "endorseeId");
CREATE INDEX IF NOT EXISTS "WebsiteEndorsement_endorseeId_status_idx" ON "WebsiteEndorsement"("endorseeId", "status");
CREATE INDEX IF NOT EXISTS "WebsiteEndorsement_endorserId_endorsedAt_idx" ON "WebsiteEndorsement"("endorserId", "endorsedAt");
CREATE INDEX IF NOT EXISTS "WebsiteEndorsement_businessLineId_status_idx" ON "WebsiteEndorsement"("businessLineId", "status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteEndorsement_businessLineId_fkey') THEN
    ALTER TABLE "WebsiteEndorsement" ADD CONSTRAINT "WebsiteEndorsement_businessLineId_fkey"
      FOREIGN KEY ("businessLineId") REFERENCES "BusinessLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteEndorsement_endorserId_fkey') THEN
    ALTER TABLE "WebsiteEndorsement" ADD CONSTRAINT "WebsiteEndorsement_endorserId_fkey"
      FOREIGN KEY ("endorserId") REFERENCES "WebsiteEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteEndorsement_endorseeId_fkey') THEN
    ALTER TABLE "WebsiteEndorsement" ADD CONSTRAINT "WebsiteEndorsement_endorseeId_fkey"
      FOREIGN KEY ("endorseeId") REFERENCES "WebsiteEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
