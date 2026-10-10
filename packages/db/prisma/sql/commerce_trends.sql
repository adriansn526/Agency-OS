-- Stock/price change journal (filled by triggers, so every writer is captured) + storefront demand counters.
-- Applied manually (new tables + two row triggers):
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os < packages/db/prisma/sql/commerce_trends.sql
-- Rollback: DROP TRIGGER commerce_stock_event_trg ON "CommerceStock"; DROP TRIGGER commerce_price_event_trg ON "CommerceListing";
--           DROP FUNCTION commerce_stock_event(); DROP FUNCTION commerce_price_event();
--           DROP TABLE "CommerceStockEvent", "CommercePriceEvent", "CommerceDemandDaily", "CommerceSearchDaily";

CREATE TABLE IF NOT EXISTS "CommerceStockEvent" (
  "id"        BIGSERIAL    PRIMARY KEY,
  "productId" TEXT         NOT NULL,
  "warehouse" TEXT         NOT NULL,
  "oldFlag"   INTEGER,
  "newFlag"   INTEGER      NOT NULL,   -- supplier flag: 1 = available, 0 = out (per warehouse)
  "at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "CommerceStockEvent_at_idx" ON "CommerceStockEvent"("at" DESC);
CREATE INDEX IF NOT EXISTS "CommerceStockEvent_productId_at_idx" ON "CommerceStockEvent"("productId", "at" DESC);

CREATE TABLE IF NOT EXISTS "CommercePriceEvent" (
  "id"        BIGSERIAL     PRIMARY KEY,
  "listingId" TEXT          NOT NULL,
  "productId" TEXT          NOT NULL,
  "oldPrice"  NUMERIC(12,2) NOT NULL,
  "newPrice"  NUMERIC(12,2) NOT NULL,
  "at"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "CommercePriceEvent_at_idx" ON "CommercePriceEvent"("at" DESC);
CREATE INDEX IF NOT EXISTS "CommercePriceEvent_productId_at_idx" ON "CommercePriceEvent"("productId", "at" DESC);

-- Storefront demand: product detail views and product searches per day (written in batches by the API).
CREATE TABLE IF NOT EXISTS "CommerceDemandDaily" (
  "day"       DATE    NOT NULL,
  "productId" TEXT    NOT NULL,
  "views"     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("day", "productId")
);
CREATE INDEX IF NOT EXISTS "CommerceDemandDaily_productId_idx" ON "CommerceDemandDaily"("productId");
CREATE TABLE IF NOT EXISTS "CommerceSearchDaily" (
  "day"  DATE    NOT NULL,
  "term" TEXT    NOT NULL,
  "n"    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("day", "term")
);

CREATE OR REPLACE FUNCTION commerce_stock_event() RETURNS trigger AS $$
BEGIN
  IF NEW."rawFlag" IS DISTINCT FROM OLD."rawFlag" THEN
    INSERT INTO "CommerceStockEvent" ("productId", "warehouse", "oldFlag", "newFlag") VALUES (NEW."productId", NEW."warehouse", OLD."rawFlag", NEW."rawFlag");
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS commerce_stock_event_trg ON "CommerceStock";
CREATE TRIGGER commerce_stock_event_trg AFTER UPDATE OF "rawFlag" ON "CommerceStock" FOR EACH ROW EXECUTE FUNCTION commerce_stock_event();

CREATE OR REPLACE FUNCTION commerce_price_event() RETURNS trigger AS $$
BEGIN
  IF OLD."priceRon" IS NOT NULL AND NEW."priceRon" IS NOT NULL AND NEW."priceRon" IS DISTINCT FROM OLD."priceRon" THEN
    INSERT INTO "CommercePriceEvent" ("listingId", "productId", "oldPrice", "newPrice") VALUES (NEW.id, NEW."productId", OLD."priceRon", NEW."priceRon");
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS commerce_price_event_trg ON "CommerceListing";
CREATE TRIGGER commerce_price_event_trg AFTER UPDATE OF "priceRon" ON "CommerceListing" FOR EACH ROW EXECUTE FUNCTION commerce_price_event();
