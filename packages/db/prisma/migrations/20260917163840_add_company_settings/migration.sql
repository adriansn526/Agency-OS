-- AlterTable
ALTER TABLE "BusinessLine" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "_BusinessLineToContractTemplate" ADD CONSTRAINT "_BusinessLineToContractTemplate_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_BusinessLineToContractTemplate_AB_unique";

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "regCom" TEXT NOT NULL,
    "cif" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "iban" TEXT,
    "bank" TEXT,
    "representative" TEXT,
    "representativeRole" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "contractsConfig" JSONB,
    "integrationsConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanySettings_tenantId_key" ON "CompanySettings"("tenantId");

-- CreateIndex
CREATE INDEX "CompanySettings_tenantId_idx" ON "CompanySettings"("tenantId");

