-- Sitemap lastmod: the page flips between noindex and indexable when a product gets its first image / loses its last one,
-- or when seoTitle becomes blank/non-blank, so CommerceListing.updatedAt must move on exactly those events.
CREATE OR REPLACE FUNCTION commerce_image_touch_listing() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (SELECT 1 FROM "CommerceProductImage" WHERE "productId" = NEW."productId" AND id <> NEW.id) THEN
      UPDATE "CommerceListing" SET "updatedAt" = now() WHERE "productId" = NEW."productId";
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM "CommerceProductImage" WHERE "productId" = OLD."productId") THEN
      UPDATE "CommerceListing" SET "updatedAt" = now() WHERE "productId" = OLD."productId";
    END IF;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS commerce_image_touch_trg ON "CommerceProductImage";
CREATE TRIGGER commerce_image_touch_trg AFTER INSERT OR DELETE ON "CommerceProductImage" FOR EACH ROW EXECUTE FUNCTION commerce_image_touch_listing();

CREATE OR REPLACE FUNCTION commerce_seo_touch_listing() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (btrim(coalesce(OLD."seoTitle", '')) = '') IS DISTINCT FROM (btrim(coalesce(NEW."seoTitle", '')) = '') THEN
    NEW."updatedAt" = now();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS commerce_seo_touch_trg ON "CommerceListing";
CREATE TRIGGER commerce_seo_touch_trg BEFORE UPDATE OF "seoTitle" ON "CommerceListing" FOR EACH ROW EXECUTE FUNCTION commerce_seo_touch_listing();
