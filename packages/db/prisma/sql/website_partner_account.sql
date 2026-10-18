-- Website module: partner accounts ("Profilul meu"): passwordless login (emailed link / SMS code) and sessions.
-- Purely additive and idempotent. Applied manually:
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os -v ON_ERROR_STOP=1 < packages/db/prisma/sql/website_partner_account.sql
-- Apply BEFORE deploying code that reads these tables.
-- Rollback: DROP TABLE "WebsitePartnerSession", "WebsitePartnerLogin"; ALTER TABLE "WebsiteEntry" DROP COLUMN "partnerAccess";

BEGIN;

ALTER TABLE "WebsiteEntry" ADD COLUMN IF NOT EXISTS "partnerAccess" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "WebsitePartnerLogin" (
  "id"        TEXT         NOT NULL,
  "entryId"   TEXT         NOT NULL,
  "channel"   TEXT         NOT NULL,
  "codeHash"  TEXT         NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts"  INTEGER      NOT NULL DEFAULT 0,
  "usedAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsitePartnerLogin_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsitePartnerLogin_channel_check" CHECK ("channel" IN ('email', 'sms')),
  CONSTRAINT "WebsitePartnerLogin_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "WebsiteEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "WebsitePartnerLogin_codeHash_key" ON "WebsitePartnerLogin"("codeHash");
CREATE INDEX IF NOT EXISTS "WebsitePartnerLogin_entryId_createdAt_idx" ON "WebsitePartnerLogin"("entryId", "createdAt");

CREATE TABLE IF NOT EXISTS "WebsitePartnerSession" (
  "id"         TEXT         NOT NULL,
  "entryId"    TEXT         NOT NULL,
  "tokenHash"  TEXT         NOT NULL,
  "expiresAt"  TIMESTAMP(3) NOT NULL,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userAgent"  TEXT,
  "ip"         TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsitePartnerSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsitePartnerSession_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "WebsiteEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "WebsitePartnerSession_tokenHash_key" ON "WebsitePartnerSession"("tokenHash");
CREATE INDEX IF NOT EXISTS "WebsitePartnerSession_entryId_idx" ON "WebsitePartnerSession"("entryId");

COMMIT;
