-- Website rules (pricing / routing / billing / recommendation) and their change log.
-- Purely additive and idempotent. Applied manually (CI only runs `prisma generate`):
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os -v ON_ERROR_STOP=1 < packages/db/prisma/sql/website_rules.sql
-- Requires website_module.sql (BusinessLine FK). Apply BEFORE deploying code that reads these tables.
-- Rollback (destroys rules and their history): DROP TABLE "WebsiteRuleAudit", "WebsiteRule";

BEGIN;

CREATE TABLE IF NOT EXISTS "WebsiteRule" (
  "id"             TEXT         NOT NULL,
  "businessLineId" TEXT         NOT NULL,
  "kind"           TEXT         NOT NULL,
  "name"           TEXT         NOT NULL,
  "priority"       INTEGER      NOT NULL DEFAULT 100,        -- lower = evaluated first; the first matching rule wins
  "isActive"       BOOLEAN      NOT NULL DEFAULT true,
  "conditions"     JSONB        NOT NULL DEFAULT '[]',       -- [{ field, op, value }], all must match
  "action"         JSONB        NOT NULL,                    -- shape depends on kind (validated in the app)
  "validFrom"      TIMESTAMP(3),
  "validTo"        TIMESTAMP(3),                             -- exclusive
  "createdBy"      TEXT,
  "updatedBy"      TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsiteRule_kind_check" CHECK ("kind" IN ('pricing', 'routing', 'billing', 'recommendation')),
  CONSTRAINT "WebsiteRule_validity_check" CHECK ("validFrom" IS NULL OR "validTo" IS NULL OR "validTo" > "validFrom")
);
CREATE INDEX IF NOT EXISTS "WebsiteRule_businessLineId_kind_priority_idx" ON "WebsiteRule"("businessLineId", "kind", "priority");

-- Append-only history. No FK on ruleId on purpose: the history must outlive a deleted rule.
CREATE TABLE IF NOT EXISTS "WebsiteRuleAudit" (
  "id"             TEXT         NOT NULL,
  "businessLineId" TEXT         NOT NULL,
  "ruleId"         TEXT,
  "kind"           TEXT         NOT NULL,
  "action"         TEXT         NOT NULL,
  "beforeData"     JSONB,
  "afterData"      JSONB,
  "userId"         TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteRuleAudit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsiteRuleAudit_action_check" CHECK ("action" IN ('create', 'update', 'delete', 'reorder'))
);
CREATE INDEX IF NOT EXISTS "WebsiteRuleAudit_businessLineId_createdAt_idx" ON "WebsiteRuleAudit"("businessLineId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "WebsiteRuleAudit_ruleId_idx" ON "WebsiteRuleAudit"("ruleId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteRule_businessLineId_fkey') THEN
    ALTER TABLE "WebsiteRule" ADD CONSTRAINT "WebsiteRule_businessLineId_fkey"
      FOREIGN KEY ("businessLineId") REFERENCES "BusinessLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteRuleAudit_businessLineId_fkey') THEN
    ALTER TABLE "WebsiteRuleAudit" ADD CONSTRAINT "WebsiteRuleAudit_businessLineId_fkey"
      FOREIGN KEY ("businessLineId") REFERENCES "BusinessLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
