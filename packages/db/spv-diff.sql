-- AlterTable
ALTER TABLE "AnafSettings" ADD COLUMN     "lastSyncAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SpvSyncLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "daysRequested" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "messagesFound" INTEGER NOT NULL DEFAULT 0,
    "invoicesImported" INTEGER NOT NULL DEFAULT 0,
    "invoicesDeduped" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "triggeredBy" TEXT,

    CONSTRAINT "SpvSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpvSyncLog_tenantId_idx" ON "SpvSyncLog"("tenantId");

