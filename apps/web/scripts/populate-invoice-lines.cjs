const { PrismaClient } = require('@prisma/client')
const { XMLParser } = require('fast-xml-parser')

const prisma = new PrismaClient()

async function main() {
  console.log('Starting retroactive invoice lines population...')
  
  const invoices = await prisma.supplierInvoice.findMany({
    where: { xmlData: { not: null } },
    include: { lines: true }
  })
  
  console.log(`Found ${invoices.length} invoices with xmlData.`)
  
  const invoicesToProcess = invoices.filter(inv => inv.lines.length === 0)
  console.log(`Found ${invoicesToProcess.length} invoices that need lines extracted.`)
  
  let processed = 0
  let skipped = 0
  const errors = []

  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    parseTagValue: false
  })

  for (const inv of invoicesToProcess) {
    try {
      const jsonObj = parser.parse(inv.xmlData)
      const invoiceData = jsonObj.Invoice
      
      if (!invoiceData) {
        throw new Error('Structura XML nu conține nodul Invoice.')
      }

      const parsedLines = []
      if (invoiceData.InvoiceLine) {
        const linesArray = Array.isArray(invoiceData.InvoiceLine) ? invoiceData.InvoiceLine : [invoiceData.InvoiceLine]
        for (const line of linesArray) {
          const item = line.Item
          const price = line.Price
          
          const name = item?.Name?.['#text'] || item?.Name || 'Nespecificat'
          const description = item?.Description?.['#text'] || item?.Description || undefined
          
          const quantityRaw = line.InvoicedQuantity?.['#text'] || line.InvoicedQuantity
          const quantity = quantityRaw !== undefined ? parseFloat(quantityRaw) : undefined
          
          const unitPriceRaw = price?.PriceAmount?.['#text'] || price?.PriceAmount
          const unitPrice = unitPriceRaw !== undefined ? parseFloat(unitPriceRaw) : undefined
          
          const totalAmountRaw = line.LineExtensionAmount?.['#text'] || line.LineExtensionAmount
          const totalAmount = totalAmountRaw !== undefined ? parseFloat(totalAmountRaw) : 0
          
          let periodStart = undefined
          let periodEnd = undefined
          
          if (line.InvoicePeriod) {
            if (line.InvoicePeriod.StartDate) periodStart = new Date(line.InvoicePeriod.StartDate)
            if (line.InvoicePeriod.EndDate) periodEnd = new Date(line.InvoicePeriod.EndDate)
          }

          parsedLines.push({
            name,
            description,
            quantity,
            unitPrice,
            totalAmount,
            periodStart,
            periodEnd
          })
        }
      }

      if (parsedLines.length > 0) {
        await prisma.supplierInvoiceLine.createMany({
          data: parsedLines.map(line => ({
            ...line,
            invoiceId: inv.id
          }))
        })
      }
      
      processed++
    } catch (err) {
      skipped++
      errors.push({ invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, error: err.message })
    }
  }

  console.log('\n--- RAPORT FINAL ---')
  console.log(`Total facturi procesate cu succes: ${processed}`)
  console.log(`Total facturi sărite/cu erori: ${skipped}`)
  
  if (errors.length > 0) {
    console.log('\nDetalii erori:')
    errors.forEach(e => console.log(`- Factura ${e.invoiceNumber} (ID: ${e.invoiceId}): ${e.error}`))
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
