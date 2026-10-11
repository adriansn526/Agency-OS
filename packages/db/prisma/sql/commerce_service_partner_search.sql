-- Audit log + daily request cap for Google Places searches used to prospect partner service garages.
-- Purely additive. Applied manually:
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os < packages/db/prisma/sql/commerce_service_partner_search.sql
-- Rollback: DROP TABLE "CommerceServicePartnerSearch";
CREATE TABLE IF NOT EXISTS "CommerceServicePartnerSearch" (
  "id"          TEXT         NOT NULL,
  "query"       TEXT         NOT NULL,
  "requests"    INTEGER      NOT NULL, -- billable Places API requests made by this search
  "resultCount" INTEGER      NOT NULL,
  "createdBy"   TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommerceServicePartnerSearch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CommerceServicePartnerSearch_createdAt_idx" ON "CommerceServicePartnerSearch"("createdAt" DESC);
