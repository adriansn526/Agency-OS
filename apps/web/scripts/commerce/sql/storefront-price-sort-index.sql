-- Speeds up /api/storefront/products?sort=price_asc|price_desc (listProducts).
-- Measured on a copy of the data: price_asc page 1 102 ms -> 0.6 ms; deep pages unchanged (~200 ms).
-- Default sort (categoryId, priceRon) is already served by CommerceProduct_categoryId_idx.
--
-- CONCURRENTLY cannot run inside a transaction, so this is NOT a Prisma migration. Run it manually, once:
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os < apps/web/scripts/commerce/sql/storefront-price-sort-index.sql
-- Partial indexes aren't expressible in schema.prisma; `prisma migrate dev` may report drift for this index.
-- Rollback: DROP INDEX CONCURRENTLY "CommerceListing_storefront_price_idx";

CREATE INDEX CONCURRENTLY IF NOT EXISTS "CommerceListing_storefront_price_idx"
  ON "CommerceListing" ("businessLineId", "priceRon", "id")
  WHERE "isActive" AND "priceRon" IS NOT NULL;
