-- Where a partner's coordinates come from and when they were fetched.
--   google: from Places (may be kept at most 30 days, then refreshed through the Place ID or deleted)
--   osm:    geocoded from the confirmed address with OpenStreetMap Nominatim (may be kept; © OpenStreetMap contributors, ODbL)
--   manual: typed in by a person (no expiry)
-- Purely additive. Applied manually:
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os < packages/db/prisma/sql/commerce_service_partners_coords.sql
ALTER TABLE "CommerceServicePartner"
  ADD COLUMN IF NOT EXISTS "coordsSource" TEXT,
  ADD COLUMN IF NOT EXISTS "coordsFetchedAt" TIMESTAMP(3);
UPDATE "CommerceServicePartner" SET "coordsSource" = 'manual' WHERE "lat" IS NOT NULL AND "coordsSource" IS NULL;
