-- Website module (Marketing → Website): per-business-line content published through the storefront API.
-- Purely additive and idempotent. Applied manually (CI only runs `prisma generate`):
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os -v ON_ERROR_STOP=1 < packages/db/prisma/sql/website_module.sql
-- Apply BEFORE deploying code that reads these tables.
-- Rollback (destroys website content):
--   DROP TABLE "WebsiteReview", "WebsiteMedia", "WebsiteEntry", "WebsiteCollection", "WebsiteChannel";

BEGIN;

-- One row per business line that has the module enabled
CREATE TABLE IF NOT EXISTS "WebsiteChannel" (
  "id"             TEXT         NOT NULL,
  "businessLineId" TEXT         NOT NULL,
  "isEnabled"      BOOLEAN      NOT NULL DEFAULT true,
  "siteUrl"        TEXT,
  "apiKeys"        JSONB        NOT NULL DEFAULT '[]', -- [{ id, label, hash (sha256 hex), createdAt, lastUsedAt }]
  "config"         JSONB,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteChannel_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WebsiteChannel_businessLineId_key" ON "WebsiteChannel"("businessLineId");

-- Collections are defined per line (listing | article | project | other) with custom field definitions
CREATE TABLE IF NOT EXISTS "WebsiteCollection" (
  "id"             TEXT         NOT NULL,
  "businessLineId" TEXT         NOT NULL,
  "key"            TEXT         NOT NULL,
  "name"           TEXT         NOT NULL,
  "namePlural"     TEXT         NOT NULL,
  "kind"           TEXT         NOT NULL DEFAULT 'listing',
  "fields"         JSONB        NOT NULL DEFAULT '[]',
  "sortOrder"      INTEGER      NOT NULL DEFAULT 0,
  "isActive"       BOOLEAN      NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteCollection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsiteCollection_kind_check" CHECK ("kind" IN ('listing', 'article', 'project', 'other'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "WebsiteCollection_businessLineId_key_key" ON "WebsiteCollection"("businessLineId", "key");
CREATE INDEX IF NOT EXISTS "WebsiteCollection_businessLineId_sortOrder_idx" ON "WebsiteCollection"("businessLineId", "sortOrder");

CREATE TABLE IF NOT EXISTS "WebsiteEntry" (
  "id"              TEXT         NOT NULL,
  "businessLineId"  TEXT         NOT NULL,
  "collectionId"    TEXT         NOT NULL,
  "slug"            TEXT         NOT NULL,
  "title"           TEXT         NOT NULL,
  "summary"         TEXT,
  "body"            TEXT,
  "status"          TEXT         NOT NULL DEFAULT 'draft',
  "verified"        BOOLEAN      NOT NULL DEFAULT false,
  "featured"        BOOLEAN      NOT NULL DEFAULT false,
  "city"            TEXT,
  "county"          TEXT,
  "address"         TEXT,
  "lat"             DOUBLE PRECISION,
  "lng"             DOUBLE PRECISION,
  "coordsSource"    TEXT,                                -- google | osm | manual
  "coordsFetchedAt" TIMESTAMP(3),
  "email"           TEXT,
  "phone"           TEXT,
  "websiteUrl"      TEXT,
  "coverUrl"        TEXT,
  "ratingAvg"       DECIMAL(3,2),
  "ratingCount"     INTEGER      NOT NULL DEFAULT 0,
  "data"            JSONB        NOT NULL DEFAULT '{}',
  "seoTitle"        TEXT,
  "seoDescription"  TEXT,
  "leadId"          TEXT,
  "clientId"        TEXT,
  "tenantId"        TEXT,                                -- ERP tenant, set when a partner is activated
  "externalSource"  TEXT,                                -- import idempotency, e.g. 'wp:companies'
  "externalId"      TEXT,
  "publishedAt"     TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsiteEntry_status_check" CHECK ("status" IN ('draft', 'published', 'suspended')),
  CONSTRAINT "WebsiteEntry_lat_check" CHECK ("lat" IS NULL OR ("lat" BETWEEN -90 AND 90)),
  CONSTRAINT "WebsiteEntry_lng_check" CHECK ("lng" IS NULL OR ("lng" BETWEEN -180 AND 180))
);
CREATE UNIQUE INDEX IF NOT EXISTS "WebsiteEntry_businessLineId_collectionId_slug_key" ON "WebsiteEntry"("businessLineId", "collectionId", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "WebsiteEntry_businessLineId_externalSource_externalId_key" ON "WebsiteEntry"("businessLineId", "externalSource", "externalId");
CREATE INDEX IF NOT EXISTS "WebsiteEntry_businessLineId_collectionId_status_idx" ON "WebsiteEntry"("businessLineId", "collectionId", "status");
CREATE INDEX IF NOT EXISTS "WebsiteEntry_county_city_idx" ON "WebsiteEntry"("county", "city");
CREATE INDEX IF NOT EXISTS "WebsiteEntry_tenantId_idx" ON "WebsiteEntry"("tenantId");
CREATE INDEX IF NOT EXISTS "WebsiteEntry_leadId_idx" ON "WebsiteEntry"("leadId");

CREATE TABLE IF NOT EXISTS "WebsiteMedia" (
  "id"         TEXT         NOT NULL,
  "entryId"    TEXT         NOT NULL,
  "kind"       TEXT         NOT NULL DEFAULT 'image',
  "storageKey" TEXT         NOT NULL,                    -- object key in the bucket (DigitalOcean Spaces)
  "url"        TEXT         NOT NULL,
  "alt"        TEXT,
  "mimeType"   TEXT,
  "sizeBytes"  INTEGER,
  "width"      INTEGER,
  "height"     INTEGER,
  "sortOrder"  INTEGER      NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteMedia_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsiteMedia_kind_check" CHECK ("kind" IN ('image', 'file'))
);
CREATE INDEX IF NOT EXISTS "WebsiteMedia_entryId_sortOrder_idx" ON "WebsiteMedia"("entryId", "sortOrder");

CREATE TABLE IF NOT EXISTS "WebsiteReview" (
  "id"             TEXT         NOT NULL,
  "entryId"        TEXT         NOT NULL,
  "businessLineId" TEXT         NOT NULL,
  "authorName"     TEXT         NOT NULL,
  "authorEmail"    TEXT,
  "rating"         INTEGER      NOT NULL,
  "title"          TEXT,
  "body"           TEXT,
  "status"         TEXT         NOT NULL DEFAULT 'pending',
  "source"         TEXT         NOT NULL DEFAULT 'site',
  "moderatedAt"    TIMESTAMP(3),
  "moderatedBy"    TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsiteReview_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
  CONSTRAINT "WebsiteReview_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected')),
  CONSTRAINT "WebsiteReview_source_check" CHECK ("source" IN ('site', 'import', 'manual'))
);
CREATE INDEX IF NOT EXISTS "WebsiteReview_entryId_status_idx" ON "WebsiteReview"("entryId", "status");
CREATE INDEX IF NOT EXISTS "WebsiteReview_businessLineId_status_idx" ON "WebsiteReview"("businessLineId", "status");

-- Foreign keys (guarded: ADD CONSTRAINT has no IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteChannel_businessLineId_fkey') THEN
    ALTER TABLE "WebsiteChannel" ADD CONSTRAINT "WebsiteChannel_businessLineId_fkey"
      FOREIGN KEY ("businessLineId") REFERENCES "BusinessLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteCollection_businessLineId_fkey') THEN
    ALTER TABLE "WebsiteCollection" ADD CONSTRAINT "WebsiteCollection_businessLineId_fkey"
      FOREIGN KEY ("businessLineId") REFERENCES "BusinessLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteEntry_businessLineId_fkey') THEN
    ALTER TABLE "WebsiteEntry" ADD CONSTRAINT "WebsiteEntry_businessLineId_fkey"
      FOREIGN KEY ("businessLineId") REFERENCES "BusinessLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteEntry_collectionId_fkey') THEN
    ALTER TABLE "WebsiteEntry" ADD CONSTRAINT "WebsiteEntry_collectionId_fkey"
      FOREIGN KEY ("collectionId") REFERENCES "WebsiteCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  -- CRM / client links: keep the entry if the lead or client is deleted
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteEntry_leadId_fkey') THEN
    ALTER TABLE "WebsiteEntry" ADD CONSTRAINT "WebsiteEntry_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteEntry_clientId_fkey') THEN
    ALTER TABLE "WebsiteEntry" ADD CONSTRAINT "WebsiteEntry_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteMedia_entryId_fkey') THEN
    ALTER TABLE "WebsiteMedia" ADD CONSTRAINT "WebsiteMedia_entryId_fkey"
      FOREIGN KEY ("entryId") REFERENCES "WebsiteEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteReview_businessLineId_fkey') THEN
    ALTER TABLE "WebsiteReview" ADD CONSTRAINT "WebsiteReview_businessLineId_fkey"
      FOREIGN KEY ("businessLineId") REFERENCES "BusinessLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteReview_entryId_fkey') THEN
    ALTER TABLE "WebsiteReview" ADD CONSTRAINT "WebsiteReview_entryId_fkey"
      FOREIGN KEY ("entryId") REFERENCES "WebsiteEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
