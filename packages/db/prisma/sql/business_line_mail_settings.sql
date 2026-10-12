-- Per-business-line mailboxes (several per line, by purpose: general / orders / partners), each with its own SMTP account, sender name, reply-to, signature. Managed in Settings → Linii de business.
-- Purely additive. Applied manually:
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os < packages/db/prisma/sql/business_line_mail_settings.sql
-- A line without an enabled row for a purpose falls back to its "general" mailbox, then to the default sender (env SMTP + built-in sender table), i.e. exactly as before.
-- Rollback: DROP TABLE "BusinessLineMailbox";

CREATE TABLE IF NOT EXISTS "BusinessLineMailbox" (
  "id"             TEXT         NOT NULL,
  "businessLineId" TEXT         NOT NULL,
  "purpose"        TEXT         NOT NULL DEFAULT 'general',
  "enabled"        BOOLEAN      NOT NULL DEFAULT false,
  "fromName"       TEXT         NOT NULL,
  "fromEmail"      TEXT         NOT NULL,
  "replyTo"        TEXT,
  "bcc"            TEXT,
  "signatureHtml"  TEXT,
  "smtpHost"       TEXT         NOT NULL,
  "smtpPort"       INTEGER      NOT NULL DEFAULT 465,
  "smtpSecure"     BOOLEAN      NOT NULL DEFAULT true,
  "smtpUser"       TEXT         NOT NULL,
  "smtpPassEnc"    TEXT,                       -- AES-256-GCM (lib/encryption.ts), never returned by the API
  "allowSelfSigned" BOOLEAN     NOT NULL DEFAULT false,
  "lastTestAt"     TIMESTAMP(3),
  "lastTestOk"     BOOLEAN,
  "lastTestError"  TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessLineMailbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BusinessLineMailbox_businessLineId_fkey" FOREIGN KEY ("businessLineId") REFERENCES "BusinessLine"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "BusinessLineMailbox_businessLineId_purpose_key" ON "BusinessLineMailbox"("businessLineId", "purpose");
