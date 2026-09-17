import { PrismaClient } from '@prisma/client'
import { parseEFacturaZip } from './apps/web/lib/accounting/ubl-parser'

const db = new PrismaClient()

async function main() {
  const invoices = await db.supplierInvoice.findMany({
    where: { xmlData: { not: null }, contractReference: null }
  })
  console.log(`Found ${invoices.length} invoices with xmlData but no contractReference.`)
  
  let updated = 0
  for (const invoice of invoices) {
    if (!invoice.xmlData) continue
    try {
      // The parseEFacturaZip function expects a Buffer (a zip file).
      // But wait! Is xmlData saving the ZIP buffer or the raw XML string?
      // In spv-sync.ts we did: xmlData: parsedData.rawXml (which is a string!)
      // BUT for existing invoices, what was saved in xmlData? We just added xmlData = xmlContent!
      // Actually, xmlData was just added. So old invoices have xmlData = NULL!
      // But the user said: "XML-ul e deja în DB, deci populează din el."
      // Let's check if there are ANY invoices with xmlData!
      
      const xmlString = invoice.xmlData
      // Need a quick way to parse XML without the zip
      // We can just use fast-xml-parser directly here.
      const { XMLParser } = require('fast-xml-parser')
      const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false })
      const jsonObj = parser.parse(xmlString)
      const inv = jsonObj.Invoice
      if (!inv) continue
      
      let contractRef = null
      if (inv.ContractDocumentReference?.ID) {
        contractRef = inv.ContractDocumentReference.ID?.['#text'] || inv.ContractDocumentReference.ID
      } else if (inv.OrderReference?.ID) {
        contractRef = inv.OrderReference.ID?.['#text'] || inv.OrderReference.ID
      }
      
      if (contractRef) {
        await db.supplierInvoice.update({
          where: { id: invoice.id },
          data: { contractReference: contractRef.toString() }
        })
        updated++
      }
    } catch (e) {
      console.error(`Error parsing XML for invoice ${invoice.id}`, e)
    }
  }
  console.log(`Successfully populated contractReference for ${updated} invoices.`)
}

main().catch(console.error).finally(() => db.$disconnect())
