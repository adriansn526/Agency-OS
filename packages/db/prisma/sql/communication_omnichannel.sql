-- Omnichannel communications, stage 1: a communication can belong to a LEAD (not only a client), has a thread, a kind
-- (message | note | event), the mailbox purpose it went through and an external id (provider message id).
-- Purely additive. Applied manually:
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os < packages/db/prisma/sql/communication_omnichannel.sql
-- Rollback: ALTER TABLE "Communication" DROP COLUMN "leadId", DROP COLUMN "threadId", DROP COLUMN "kind", DROP COLUMN "mailbox", DROP COLUMN "externalId";

ALTER TABLE "Communication" ADD COLUMN IF NOT EXISTS "leadId"     TEXT;
ALTER TABLE "Communication" ADD COLUMN IF NOT EXISTS "threadId"   TEXT;
ALTER TABLE "Communication" ADD COLUMN IF NOT EXISTS "kind"       TEXT NOT NULL DEFAULT 'message';
ALTER TABLE "Communication" ADD COLUMN IF NOT EXISTS "mailbox"    TEXT;
ALTER TABLE "Communication" ADD COLUMN IF NOT EXISTS "externalId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Communication" ADD CONSTRAINT "Communication_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Communication_leadId_idx"   ON "Communication"("leadId");
CREATE INDEX IF NOT EXISTS "Communication_threadId_idx" ON "Communication"("threadId");
CREATE UNIQUE INDEX IF NOT EXISTS "Communication_externalId_key" ON "Communication"("externalId") WHERE "externalId" IS NOT NULL;
