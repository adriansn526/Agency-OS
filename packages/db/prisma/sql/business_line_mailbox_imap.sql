-- Mailboxes: unlimited per line (free-form key + label) and optional IMAP receiving (inbox -> lead/client timeline).
-- Purely additive. Applied manually:
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os < packages/db/prisma/sql/business_line_mailbox_imap.sql
-- IMAP stays off per mailbox until "imapEnabled" is ticked in Settings → Linii de business. The IMAP password defaults to the SMTP one.
-- Rollback: ALTER TABLE "BusinessLineMailbox" DROP COLUMN "label", DROP COLUMN "imapEnabled", ... (all columns below).

ALTER TABLE "BusinessLineMailbox" ADD COLUMN IF NOT EXISTS "label"             TEXT;
ALTER TABLE "BusinessLineMailbox" ADD COLUMN IF NOT EXISTS "imapEnabled"       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BusinessLineMailbox" ADD COLUMN IF NOT EXISTS "imapHost"          TEXT;
ALTER TABLE "BusinessLineMailbox" ADD COLUMN IF NOT EXISTS "imapPort"          INTEGER NOT NULL DEFAULT 993;
ALTER TABLE "BusinessLineMailbox" ADD COLUMN IF NOT EXISTS "imapSecure"        BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "BusinessLineMailbox" ADD COLUMN IF NOT EXISTS "imapUser"          TEXT;
ALTER TABLE "BusinessLineMailbox" ADD COLUMN IF NOT EXISTS "imapPassEnc"       TEXT;
ALTER TABLE "BusinessLineMailbox" ADD COLUMN IF NOT EXISTS "imapFolder"        TEXT NOT NULL DEFAULT 'INBOX';
ALTER TABLE "BusinessLineMailbox" ADD COLUMN IF NOT EXISTS "imapUidValidity"   BIGINT;
ALTER TABLE "BusinessLineMailbox" ADD COLUMN IF NOT EXISTS "imapLastUid"       BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "BusinessLineMailbox" ADD COLUMN IF NOT EXISTS "imapLastSyncAt"    TIMESTAMP(3);
ALTER TABLE "BusinessLineMailbox" ADD COLUMN IF NOT EXISTS "imapLastOk"        BOOLEAN;
ALTER TABLE "BusinessLineMailbox" ADD COLUMN IF NOT EXISTS "imapLastError"     TEXT;
ALTER TABLE "BusinessLineMailbox" ADD COLUMN IF NOT EXISTS "imapSyncStartedAt" TIMESTAMP(3); -- the lock: one sync per mailbox across processes
ALTER TABLE "BusinessLineMailbox" ADD COLUMN IF NOT EXISTS "imapLastCount"     INTEGER;
