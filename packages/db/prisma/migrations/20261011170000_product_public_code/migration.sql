-- Public product code ("EC" + 8 hex): shown by the storefront in place of the supplier's internal code (supplierCode).
-- Applied by hand on the live DB in steps (the index is built CONCURRENTLY, which cannot run inside a migration transaction).
ALTER TABLE "CommerceProduct" ADD COLUMN IF NOT EXISTS "publicCode" TEXT;

CREATE OR REPLACE FUNCTION commerce_new_public_code() RETURNS text LANGUAGE plpgsql AS $$
DECLARE c text;
BEGIN
  LOOP
    c := 'EC' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM "CommerceProduct" WHERE "publicCode" = c);
  END LOOP;
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION commerce_product_public_code() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."publicCode" IS NULL THEN NEW."publicCode" := commerce_new_public_code(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS commerce_product_public_code_trg ON "CommerceProduct";
CREATE TRIGGER commerce_product_public_code_trg BEFORE INSERT ON "CommerceProduct" FOR EACH ROW EXECUTE FUNCTION commerce_product_public_code();

-- backfill (one statement; a collision, if any, is fixed below before the unique index is built)
UPDATE "CommerceProduct" SET "publicCode" = 'EC' || upper(substr(md5(random()::text || id), 1, 8)) WHERE "publicCode" IS NULL;
UPDATE "CommerceProduct" p SET "publicCode" = commerce_new_public_code()
 WHERE "publicCode" IN (SELECT "publicCode" FROM "CommerceProduct" GROUP BY 1 HAVING count(*) > 1);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "CommerceProduct_publicCode_key" ON "CommerceProduct" ("publicCode");
