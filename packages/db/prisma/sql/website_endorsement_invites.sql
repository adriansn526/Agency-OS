-- Invitations to recommend a colleague who has no profile yet ("referral link").
-- Purely additive and idempotent. Applied manually (CI only runs `prisma generate`):
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os -v ON_ERROR_STOP=1 < packages/db/prisma/sql/website_endorsement_invites.sql
-- Requires website_endorsements.sql. Apply BEFORE deploying code that reads or writes this table.
-- Rollback (destroys the invitations): DROP TABLE "WebsiteEndorsementInvite";

BEGIN;

CREATE TABLE IF NOT EXISTS "WebsiteEndorsementInvite" (
  "id"                 TEXT         NOT NULL,
  "businessLineId"     TEXT         NOT NULL,
  "inviterId"          TEXT         NOT NULL,                  -- the doctor who recommends (WebsiteEntry)
  "codeHash"           TEXT         NOT NULL,                  -- sha256 of the code in the link; the plain code is shown once
  "inviteeName"        TEXT,                                   -- as typed by the inviter, only for the greeting
  "forServicii"        JSONB        NOT NULL DEFAULT '[]',     -- taxonomy slugs the colleague is recommended for
  "note"               TEXT,                                   -- max 280 characters
  "showName"           BOOLEAN      NOT NULL DEFAULT true,
  "status"             TEXT         NOT NULL DEFAULT 'sent',   -- sent | registered | confirmed | rejected | revoked
  "inviteeEntryId"     TEXT,                                   -- the profile created (or matched) through the link
  "endorsementId"      TEXT,                                   -- the endorsement created when the inviter confirms
  "expiresAt"          TIMESTAMP(3) NOT NULL,
  "openedAt"           TIMESTAMP(3),
  "registeredAt"       TIMESTAMP(3),
  "confirmedAt"        TIMESTAMP(3),
  "publishedNotifiedAt" TIMESTAMP(3),                          -- the inviter was told the colleague's profile went public
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteEndorsementInvite_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsiteEndorsementInvite_status_check" CHECK ("status" IN ('sent', 'registered', 'confirmed', 'rejected', 'revoked')),
  CONSTRAINT "WebsiteEndorsementInvite_note_check" CHECK ("note" IS NULL OR char_length("note") <= 280)
);
CREATE UNIQUE INDEX IF NOT EXISTS "WebsiteEndorsementInvite_codeHash_key" ON "WebsiteEndorsementInvite"("codeHash");
CREATE INDEX IF NOT EXISTS "WebsiteEndorsementInvite_inviterId_createdAt_idx" ON "WebsiteEndorsementInvite"("inviterId", "createdAt");
CREATE INDEX IF NOT EXISTS "WebsiteEndorsementInvite_businessLineId_status_idx" ON "WebsiteEndorsementInvite"("businessLineId", "status");
CREATE INDEX IF NOT EXISTS "WebsiteEndorsementInvite_inviteeEntryId_idx" ON "WebsiteEndorsementInvite"("inviteeEntryId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteEndorsementInvite_businessLineId_fkey') THEN
    ALTER TABLE "WebsiteEndorsementInvite" ADD CONSTRAINT "WebsiteEndorsementInvite_businessLineId_fkey"
      FOREIGN KEY ("businessLineId") REFERENCES "BusinessLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteEndorsementInvite_inviterId_fkey') THEN
    ALTER TABLE "WebsiteEndorsementInvite" ADD CONSTRAINT "WebsiteEndorsementInvite_inviterId_fkey"
      FOREIGN KEY ("inviterId") REFERENCES "WebsiteEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteEndorsementInvite_inviteeEntryId_fkey') THEN
    ALTER TABLE "WebsiteEndorsementInvite" ADD CONSTRAINT "WebsiteEndorsementInvite_inviteeEntryId_fkey"
      FOREIGN KEY ("inviteeEntryId") REFERENCES "WebsiteEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
