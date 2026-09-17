-- DropIndex
DROP INDEX "AccountingSettings_tenantId_key";

-- AlterTable
ALTER TABLE "AccountingSettings" ADD COLUMN     "defaultVatRate" DECIMAL(65,30),
ADD COLUMN     "isVatPayer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxRate" DECIMAL(65,30),
ADD COLUMN     "taxRegime" TEXT,
ADD COLUMN     "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "validTo" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SupplierInvoice" ADD COLUMN     "appliedRuleId" TEXT,
ADD COLUMN     "deductibilityOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "expenseCategory" TEXT,
ADD COLUMN     "expenseDeductiblePercent" DECIMAL(65,30),
ADD COLUMN     "netAmount" DECIMAL(65,30),
ADD COLUMN     "vatAmount" DECIMAL(65,30),
ADD COLUMN     "vatDeductiblePercent" DECIMAL(65,30),
ADD COLUMN     "vatRate" DECIMAL(65,30);

-- CreateTable
CREATE TABLE "DeductibilityRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supplierId" TEXT,
    "expenseCategory" TEXT,
    "vatDeductiblePercent" DECIMAL(65,30) NOT NULL,
    "expenseDeductiblePercent" DECIMAL(65,30) NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeductibilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeductibilityRule_tenantId_idx" ON "DeductibilityRule"("tenantId");
CREATE INDEX "AccountingSettings_tenantId_idx" ON "AccountingSettings"("tenantId");
CREATE UNIQUE INDEX "AccountingSettings_current_unique" ON "AccountingSettings"("tenantId") WHERE "validTo" IS NULL;
