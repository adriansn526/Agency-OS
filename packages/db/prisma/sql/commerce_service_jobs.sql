-- One row per partner service ordered with a storefront order (painting / mounting at a partner garage).
-- It is the basis of the settlement with the partner: sale price charged to the customer (VAT included) and the cost owed to the partner,
-- both frozen at order time. Purely additive. Applied manually:
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os < packages/db/prisma/sql/commerce_service_jobs.sql
-- Rollback: DROP TABLE "CommerceServiceJob";
CREATE TABLE IF NOT EXISTS "CommerceServiceJob" (
  "id"             TEXT          NOT NULL,
  "orderId"        TEXT          NOT NULL,
  "orderItemId"    TEXT,
  "partnerId"      TEXT          NOT NULL,
  "service"        TEXT          NOT NULL, -- mount | paint | paint_mount
  "status"         TEXT          NOT NULL DEFAULT 'pending', -- pending | scheduled | done | settled | cancelled
  "saleRon"        NUMERIC(12,2) NOT NULL, -- charged to the customer, VAT included
  "settlementRon"  NUMERIC(12,2) NOT NULL, -- owed to the partner
  "forProductName" TEXT,
  "paintCode"      TEXT,
  "vin"            TEXT,
  "scheduledAt"    TIMESTAMP(3),
  "doneAt"         TIMESTAMP(3),
  "settledAt"      TIMESTAMP(3),
  "settlementRef"  TEXT,
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommerceServiceJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommerceServiceJob_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CommerceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommerceServiceJob_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "CommerceOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CommerceServiceJob_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "CommerceServicePartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CommerceServiceJob_partnerId_status_idx" ON "CommerceServiceJob"("partnerId", "status");
CREATE INDEX IF NOT EXISTS "CommerceServiceJob_orderId_idx" ON "CommerceServiceJob"("orderId");
