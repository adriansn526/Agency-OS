-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'RO',
ADD COLUMN     "invoiceFetchMethod" TEXT NOT NULL DEFAULT 'efactura',
ADD COLUMN     "invoiceSenderEmails" TEXT[],
ADD COLUMN     "vatNumber" TEXT,
ADD COLUMN     "vatRegime" TEXT NOT NULL DEFAULT 'domestic';

