-- Product images stored as references into the public bucket (media-imgs); nothing is copied into the ERP.
-- source: 'auto' (import from parts/) | 'manual' (uploaded from the ERP under manual/). Manual images always win.
-- Applied manually (new table, same as the other commerce tables):
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os < packages/db/prisma/sql/commerce_product_image.sql
CREATE TABLE IF NOT EXISTS "CommerceProductImage" (
  "id"          TEXT         NOT NULL,
  "productId"   TEXT         NOT NULL,
  "objectKey"   TEXT         NOT NULL,
  "position"    INTEGER      NOT NULL DEFAULT 0,
  "width"       INTEGER,
  "height"      INTEGER,
  "sizeBytes"   INTEGER,
  "source"      TEXT         NOT NULL DEFAULT 'auto',
  "lastSeenAt"  TIMESTAMP(3),
  "missingSince" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommerceProductImage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommerceProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CommerceProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CommerceProductImage_productId_objectKey_key" ON "CommerceProductImage"("productId", "objectKey");
CREATE INDEX IF NOT EXISTS "CommerceProductImage_productId_position_idx" ON "CommerceProductImage"("productId", "position");
CREATE INDEX IF NOT EXISTS "CommerceProductImage_source_lastSeenAt_idx" ON "CommerceProductImage"("source", "lastSeenAt");
