/*
  Warnings:
  - You are about to drop the column `businessLines` on the `ContractTemplate` table. All the data in the column will be lost.

  - Added the required column `isGlobal` to the `ContractTemplate` table with a default value of true.
*/

-- AlterTable
ALTER TABLE "ContractTemplate" DROP COLUMN "businessLines";
ALTER TABLE "ContractTemplate" ADD COLUMN "isGlobal" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "_BusinessLineToContractTemplate" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_BusinessLineToContractTemplate_AB_unique" ON "_BusinessLineToContractTemplate"("A", "B");

-- CreateIndex
CREATE INDEX "_BusinessLineToContractTemplate_B_index" ON "_BusinessLineToContractTemplate"("B");

-- AddForeignKey
ALTER TABLE "_BusinessLineToContractTemplate" ADD CONSTRAINT "_BusinessLineToContractTemplate_A_fkey" FOREIGN KEY ("A") REFERENCES "BusinessLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BusinessLineToContractTemplate" ADD CONSTRAINT "_BusinessLineToContractTemplate_B_fkey" FOREIGN KEY ("B") REFERENCES "ContractTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
