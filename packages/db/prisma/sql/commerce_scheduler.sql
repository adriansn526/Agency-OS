-- In-app scheduler for the commerce jobs (supplier feed sync, BNR repricing, partner coordinates), configured from /commerce/schedules.
-- Purely additive. Applied manually:
--   docker exec -i agency-os-postgres psql -U agency_os -d agency_os < packages/db/prisma/sql/commerce_scheduler.sql
-- Nothing runs until the master switch AND a job are enabled in the UI (both default to off).
-- Rollback: DROP TABLE "CommerceScheduledJobRun", "CommerceScheduledJob", "CommerceSchedulerState";

CREATE TABLE IF NOT EXISTS "CommerceSchedulerState" (
  "id"          TEXT         NOT NULL,
  "enabled"     BOOLEAN      NOT NULL DEFAULT false,
  "heartbeatAt" TIMESTAMP(3),
  "instanceId"  TEXT,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommerceSchedulerState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CommerceScheduledJob" (
  "id"             TEXT         NOT NULL,
  "key"            TEXT         NOT NULL,
  "enabled"        BOOLEAN      NOT NULL DEFAULT false,
  "schedule"       JSONB        NOT NULL,
  "nextRunAt"      TIMESTAMP(3),
  "lastRunAt"      TIMESTAMP(3),
  "lastStatus"     TEXT,
  "lastDurationMs" INTEGER,
  "lastSummary"    JSONB,
  "lastError"      TEXT,
  "runningSince"   TIMESTAMP(3), -- the lock: one run of a job at a time, across processes
  "runningBy"      TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommerceScheduledJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CommerceScheduledJob_key_key" ON "CommerceScheduledJob"("key");

CREATE TABLE IF NOT EXISTS "CommerceScheduledJobRun" (
  "id"         TEXT         NOT NULL,
  "jobKey"     TEXT         NOT NULL,
  "trigger"    TEXT         NOT NULL, -- schedule | manual
  "dryRun"     BOOLEAN      NOT NULL DEFAULT false,
  "status"     TEXT         NOT NULL DEFAULT 'running', -- running | success | unchanged | skipped | aborted | failed | missed
  "startedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "durationMs" INTEGER,
  "summary"    JSONB,
  "error"      TEXT,
  "startedBy"  TEXT,
  CONSTRAINT "CommerceScheduledJobRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CommerceScheduledJobRun_jobKey_startedAt_idx" ON "CommerceScheduledJobRun"("jobKey", "startedAt" DESC);
