-- 1) Suppliers per business line.
--    Supplier.businessLineIds: the lines a supplier is shown on. EMPTY = all lines (shared, e.g. software vendors), which is what every
--    existing supplier keeps, so nothing disappears anywhere. A non-empty list restricts the supplier to those lines.
-- 2) Link a partner garage (CommerceServicePartner) to its accounting supplier (invoices, payments).
-- Purely additive (new columns with defaults / nullable). Apply BEFORE deploying the code that reads them:
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os < packages/db/prisma/sql/supplier_business_lines.sql
-- Rollback: ALTER TABLE "Supplier" DROP COLUMN "businessLineIds"; ALTER TABLE "CommerceServicePartner" DROP COLUMN "supplierId";
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "businessLineIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE INDEX IF NOT EXISTS "Supplier_businessLineIds_idx" ON "Supplier" USING GIN ("businessLineIds");

ALTER TABLE "CommerceServicePartner" ADD COLUMN IF NOT EXISTS "supplierId" TEXT;
CREATE INDEX IF NOT EXISTS "CommerceServicePartner_supplierId_idx" ON "CommerceServicePartner"("supplierId");
DO $$ BEGIN
  ALTER TABLE "CommerceServicePartner" ADD CONSTRAINT "CommerceServicePartner_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
