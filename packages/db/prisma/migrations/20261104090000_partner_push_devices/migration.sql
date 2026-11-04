-- Push devices of the partner mobile app (Expo push tokens), one row per token.
CREATE TABLE IF NOT EXISTS "WebsitePartnerDevice" (
  "id" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsitePartnerDevice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WebsitePartnerDevice_token_key" ON "WebsitePartnerDevice"("token");
CREATE INDEX IF NOT EXISTS "WebsitePartnerDevice_entryId_idx" ON "WebsitePartnerDevice"("entryId");
ALTER TABLE "WebsitePartnerDevice" ADD CONSTRAINT "WebsitePartnerDevice_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "WebsiteEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
