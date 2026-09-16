import { PrismaClient } from '@prisma/client'
import { XMLParser } from 'fast-xml-parser'

const db = new PrismaClient()

async function main() {
  console.log('Starting CUI seeding and orphan invoice linking...')
  const invoices = await db.supplierInvoice.findMany({
    where: {
      xmlData: { not: null }
    }
  })

  console.log(`Found ${invoices.length} invoices with XML data.`)

  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    parseTagValue: false
  })

  let updatedSuppliers = 0
  let linkedInvoices = 0

  for (const invoice of invoices) {
    if (!invoice.xmlData) continue

    try {
      const jsonObj = parser.parse(invoice.xmlData)
      const invNode = jsonObj.Invoice
      if (!invNode) continue

      const supplierParty = invNode.AccountingSupplierParty?.Party
      if (!supplierParty) continue

      const numeFurnizor = supplierParty?.PartyName?.Name || supplierParty?.PartyLegalEntity?.RegistrationName
      let cuiFurnizor = supplierParty?.PartyTaxScheme?.CompanyID || supplierParty?.PartyIdentification?.ID
      
      if (Array.isArray(cuiFurnizor)) cuiFurnizor = cuiFurnizor[0]
      if (typeof cuiFurnizor === 'object' && cuiFurnizor['#text']) cuiFurnizor = cuiFurnizor['#text']
      cuiFurnizor = (cuiFurnizor || '').toString().replace(/[^A-Z0-9]/gi, '')

      if (!cuiFurnizor || !numeFurnizor) continue

      let matchedSupplierId = invoice.supplierId

      // Dacă factura e orfană, încercăm să găsim un furnizor
      if (!matchedSupplierId) {
        // Căutare exactă sau parțială (primele 5 caractere)
        const possibleSupplier = await db.supplier.findFirst({
          where: {
            tenantId: invoice.tenantId,
            OR: [
              { cui: cuiFurnizor },
              { name: { equals: numeFurnizor, mode: 'insensitive' } },
              { name: { contains: numeFurnizor.substring(0, 5), mode: 'insensitive' } }
            ]
          }
        })

        if (possibleSupplier) {
          matchedSupplierId = possibleSupplier.id
          await db.supplierInvoice.update({
            where: { id: invoice.id },
            data: { supplierId: matchedSupplierId }
          })
          linkedInvoices++
        }
      }

      // Dacă acum avem un supplier, îi actualizăm CUI-ul dacă îi lipsește
      if (matchedSupplierId) {
        const supplier = await db.supplier.findUnique({ where: { id: matchedSupplierId } })
        if (supplier && !supplier.cui) {
          await db.supplier.update({
            where: { id: supplier.id },
            data: { cui: cuiFurnizor }
          })
          updatedSuppliers++
          console.log(`Updated CUI for supplier ${supplier.name} -> ${cuiFurnizor}`)
        }
      }

    } catch (e) {
      console.error(`Error parsing XML for invoice ${invoice.id}:`, (e as Error).message)
    }
  }

  console.log('--- DONE ---')
  console.log(`Linked ${linkedInvoices} orphan invoices to suppliers.`)
  console.log(`Seeded CUI for ${updatedSuppliers} suppliers.`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
