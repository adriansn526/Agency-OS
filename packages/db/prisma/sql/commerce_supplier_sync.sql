-- Supplier price & stock sync (PRICELIST + OUTOFSTOCK): run history, file state, review queue, "missing from feed" state.
-- Purely additive: no existing table or column is touched. Applied manually (same as the other commerce tables):
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os < packages/db/prisma/sql/commerce_supplier_sync.sql
-- Rollback: DROP TABLE "CommerceSyncMissing", "CommerceSyncReview", "CommerceSyncFile", "CommerceSyncRun";

CREATE TABLE IF NOT EXISTS "CommerceSyncRun" (
  "id"          TEXT         NOT NULL,
  "feedId"      TEXT         NOT NULL,
  "job"         TEXT         NOT NULL, -- feed_sync | reprice
  "status"      TEXT         NOT NULL DEFAULT 'running', -- running | success | unchanged | aborted | failed
  "dryRun"      BOOLEAN      NOT NULL DEFAULT false,
  "triggeredBy" TEXT,
  "startedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt"  TIMESTAMP(3),
  "durationMs"  INTEGER,
  "stats"       JSONB,
  "error"       TEXT,
  "alerted"     BOOLEAN      NOT NULL DEFAULT false,
  CONSTRAINT "CommerceSyncRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommerceSyncRun_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "CommerceSupplierFeed"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CommerceSyncRun_feedId_startedAt_idx" ON "CommerceSyncRun"("feedId", "startedAt" DESC);
-- One writing run per feed at a time (this is the lock; dry-runs do not take it).
CREATE UNIQUE INDEX IF NOT EXISTS "CommerceSyncRun_one_running_idx" ON "CommerceSyncRun"("feedId") WHERE "status" = 'running' AND NOT "dryRun";

-- Last successfully applied state of each supplier file (change detection + the "not below 90% of the previous run" check).
CREATE TABLE IF NOT EXISTS "CommerceSyncFile" (
  "id"          TEXT         NOT NULL,
  "feedId"      TEXT         NOT NULL,
  "name"        TEXT         NOT NULL,
  "remoteMtime" TIMESTAMP(3) NOT NULL,
  "size"        INTEGER      NOT NULL,
  "sha256"      TEXT         NOT NULL,
  "rows"        INTEGER      NOT NULL,
  "appliedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommerceSyncFile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommerceSyncFile_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "CommerceSupplierFeed"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CommerceSyncFile_feedId_name_key" ON "CommerceSyncFile"("feedId", "name");

-- Review queue: price moves above the configured threshold and new supplier articles (created inactive).
CREATE TABLE IF NOT EXISTS "CommerceSyncReview" (
  "id"           TEXT          NOT NULL,
  "feedId"       TEXT          NOT NULL,
  "kind"         TEXT          NOT NULL, -- price_change | new_product
  "productId"    TEXT,
  "supplierCode" TEXT          NOT NULL,
  "status"       TEXT          NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  "oldCost"      NUMERIC(12,2),
  "newCost"      NUMERIC(12,2),
  "oldPriceRon"  NUMERIC(12,2),
  "newPriceRon"  NUMERIC(12,2),
  "changePct"    NUMERIC(10,2),
  "payload"      JSONB,
  "runId"        TEXT,
  "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt"    TIMESTAMP(3),
  "decidedBy"    TEXT,
  CONSTRAINT "CommerceSyncReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommerceSyncReview_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "CommerceSupplierFeed"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommerceSyncReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CommerceProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CommerceSyncReview_status_kind_createdAt_idx" ON "CommerceSyncReview"("status", "kind", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "CommerceSyncReview_productId_idx" ON "CommerceSyncReview"("productId");
CREATE UNIQUE INDEX IF NOT EXISTS "CommerceSyncReview_one_pending_idx" ON "CommerceSyncReview"("feedId", "supplierCode", "kind") WHERE "status" = 'pending';

-- Products the sync deactivated because they vanished from the price list (so only those are reactivated if they come back).
CREATE TABLE IF NOT EXISTS "CommerceSyncMissing" (
  "productId"    TEXT         NOT NULL,
  "feedId"       TEXT         NOT NULL,
  "missingSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommerceSyncMissing_pkey" PRIMARY KEY ("productId"),
  CONSTRAINT "CommerceSyncMissing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CommerceProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
