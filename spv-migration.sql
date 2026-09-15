-- AlterTable
ALTER TABLE "SupplierInvoice" ADD COLUMN     "spvId" TEXT,
ADD COLUMN     "xmlData" TEXT;

-- CreateTable
CREATE TABLE "AnafSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnafSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnafSettings_tenantId_key" ON "AnafSettings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierInvoice_spvId_key" ON "SupplierInvoice"("spvId");

-- AddForeignKey
ALTER TABLE "AnafSettings" ADD CONSTRAINT "AnafSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "TenantInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

