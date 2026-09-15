-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_businessLineId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_clientId_fkey";

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "extractedClientCui" TEXT,
ADD COLUMN     "extractedClientName" TEXT,
ADD COLUMN     "extractionStatus" TEXT NOT NULL DEFAULT 'confirmed',
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "spvId" TEXT,
ADD COLUMN     "xmlData" TEXT,
ALTER COLUMN "businessLineId" DROP NOT NULL,
ALTER COLUMN "clientId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_spvId_key" ON "Invoice"("spvId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_businessLineId_fkey" FOREIGN KEY ("businessLineId") REFERENCES "BusinessLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

