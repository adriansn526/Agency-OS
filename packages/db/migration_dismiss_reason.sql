ALTER TABLE "BankTransaction" ADD COLUMN "dismissReason" TEXT,
ADD COLUMN "dismissedAt" TIMESTAMP(3),
ADD COLUMN "dismissedBy" TEXT;
