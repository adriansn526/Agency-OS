-- Partner service registry (painting / mounting garages) for the eCaroseria "La Cheie" services.
-- Purely additive. Applied manually (same as the other commerce tables):
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os < packages/db/prisma/sql/commerce_service_partners.sql
-- Rollback: DROP TABLE "CommerceServicePartnerRate", "CommerceServicePartner";

CREATE TABLE IF NOT EXISTS "CommerceServicePartner" (
  "id"              TEXT          NOT NULL,
  "businessLineId"  TEXT          NOT NULL,
  "name"            TEXT          NOT NULL,
  "status"          TEXT          NOT NULL DEFAULT 'prospect', -- prospect | contacted | negotiating | active | inactive | declined
  "address"         TEXT,
  "city"            TEXT,
  "county"          TEXT,
  "lat"             DOUBLE PRECISION,
  "lng"             DOUBLE PRECISION,
  "phone"           TEXT,
  "email"           TEXT,
  "website"         TEXT,
  "contactPerson"   TEXT,
  "services"        TEXT[]        NOT NULL DEFAULT ARRAY[]::TEXT[], -- mount | paint | paint_mount
  "googlePlaceId"   TEXT,
  "googleMapsUrl"   TEXT,
  "rating"          NUMERIC(3,2),
  "ratingCount"     INTEGER,
  "source"          TEXT          NOT NULL DEFAULT 'manual', -- manual | csv | google_maps
  "notes"           TEXT,
  "lastContactedAt" TIMESTAMP(3),
  "activatedAt"     TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommerceServicePartner_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommerceServicePartner_businessLineId_fkey" FOREIGN KEY ("businessLineId") REFERENCES "BusinessLine"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CommerceServicePartner_bl_status_idx" ON "CommerceServicePartner"("businessLineId", "status");
CREATE INDEX IF NOT EXISTS "CommerceServicePartner_county_city_idx" ON "CommerceServicePartner"("county", "city");
-- A Google place is registered once per business line (the id identifies the business, not its data).
CREATE UNIQUE INDEX IF NOT EXISTS "CommerceServicePartner_bl_place_key" ON "CommerceServicePartner"("businessLineId", "googlePlaceId") WHERE "googlePlaceId" IS NOT NULL;

-- What the partner charges us (settlementRon) per service, optionally per part size class; the shop sale price is set separately.
CREATE TABLE IF NOT EXISTS "CommerceServicePartnerRate" (
  "id"            TEXT          NOT NULL,
  "partnerId"     TEXT          NOT NULL,
  "service"       TEXT          NOT NULL, -- mount | paint | paint_mount
  "bulkyClass"    TEXT, -- NULL = any (small | standard | large | xlarge otherwise)
  "settlementRon" NUMERIC(12,2) NOT NULL,
  "salePriceRon"  NUMERIC(12,2),
  "leadTimeDays"  INTEGER,
  "isActive"      BOOLEAN       NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommerceServicePartnerRate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommerceServicePartnerRate_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "CommerceServicePartner"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CommerceServicePartnerRate_key" ON "CommerceServicePartnerRate"("partnerId", "service", COALESCE("bulkyClass", ''));
