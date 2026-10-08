import { XMLParser } from 'fast-xml-parser'
import puppeteer from 'puppeteer'

function extractText(node: any): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (node && node['#text']) return String(node['#text'])
  return ''
}

export async function generatePdfFromUblXml(xmlData: string, invoiceNumber: string): Promise<Buffer> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    textNodeName: '#text',
    removeNSPrefix: true
  })
  
  const parsed = parser.parse(xmlData)
  const inv = parsed.Invoice

  if (!inv) {
    throw new Error('Fișierul XML nu este o factură UBL validă')
  }

  // Extragere date principale
  const invNumber = extractText(inv.ID) || invoiceNumber
  const issueDate = extractText(inv.IssueDate)
  
  // Furnizor
  const supplierParty = inv.AccountingSupplierParty?.Party
  const supplierName = extractText(supplierParty?.PartyName?.Name || supplierParty?.PartyLegalEntity?.RegistrationName)
  const supplierCUI = extractText(supplierParty?.PartyTaxScheme?.CompanyID)
  const supplierAddress = extractText(supplierParty?.PostalAddress?.StreetName) + ' ' + extractText(supplierParty?.PostalAddress?.CityName)
  
  // Client
  const customerParty = inv.AccountingCustomerParty?.Party
  const customerName = extractText(customerParty?.PartyName?.Name || customerParty?.PartyLegalEntity?.RegistrationName)
  const customerCUI = extractText(customerParty?.PartyTaxScheme?.CompanyID)
  const customerAddress = extractText(customerParty?.PostalAddress?.StreetName) + ' ' + extractText(customerParty?.PostalAddress?.CityName)
  
  // Sume totale
  const taxTotalAmount = extractText(inv.TaxTotal?.TaxAmount) || '0'
  const legalMonetaryTotal = inv.LegalMonetaryTotal
  const taxExclusiveAmount = extractText(legalMonetaryTotal?.TaxExclusiveAmount) || '0'
  const taxInclusiveAmount = extractText(legalMonetaryTotal?.TaxInclusiveAmount) || '0'
  const payableAmount = extractText(legalMonetaryTotal?.PayableAmount) || '0'
  const currency = extractText(inv.DocumentCurrencyCode) || 'RON'

  // Linii factură
  let lines = inv.InvoiceLine || []
  if (!Array.isArray(lines)) {
    lines = [lines]
  }

  let itemsHtml = ''
  lines.forEach((line: any, idx: number) => {
    const name = extractText(line.Item?.Name)
    const qty = extractText(line.InvoicedQuantity)
    const unit = line.InvoicedQuantity?.['@_unitCode'] || ''
    const price = extractText(line.Price?.PriceAmount)
    const total = extractText(line.LineExtensionAmount)
    
    let taxPercent = ''
    const taxCategory = line.Item?.ClassifiedTaxCategory || line.TaxTotal?.TaxSubtotal?.TaxCategory
    if (taxCategory) {
      taxPercent = extractText(taxCategory.Percent)
    }

    itemsHtml += `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${qty} ${unit}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${price}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${taxPercent ? taxPercent + '%' : '-'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${total}</td>
      </tr>
    `
  })

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Factura ${invNumber}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; font-size: 14px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
        .title { font-size: 28px; font-weight: bold; color: #0f172a; margin: 0; }
        .meta { text-align: right; color: #64748b; }
        .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .party { width: 45%; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .party h3 { margin-top: 0; margin-bottom: 10px; color: #334155; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
        .party p { margin: 4px 0; }
        .party strong { color: #0f172a; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        th { background: #0f172a; color: white; padding: 12px 10px; text-align: left; font-size: 13px; font-weight: 500; }
        th.right { text-align: right; }
        th.center { text-align: center; }
        .totals { width: 40%; margin-left: auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
        .totals-row { display: flex; justify-content: space-between; padding: 12px 20px; border-bottom: 1px solid #e2e8f0; }
        .totals-row:last-child { border-bottom: none; background: #0f172a; color: white; font-weight: bold; font-size: 16px; }
        .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="title">FACTURĂ FISCALĂ</h1>
          <p style="margin: 5px 0 0 0; font-size: 16px; color: #475569;">E-Factura / UBL</p>
        </div>
        <div class="meta">
          <p style="font-size: 16px; margin: 0 0 5px 0;">Seria / Număr: <strong>${invNumber}</strong></p>
          <p style="margin: 0;">Data Emiterii: <strong>${issueDate}</strong></p>
        </div>
      </div>

      <div class="parties">
        <div class="party">
          <h3>FURNIZORI</h3>
          <p>Denumire: <strong>${supplierName}</strong></p>
          <p>CUI/CIF: <strong>${supplierCUI}</strong></p>
          <p>Adresă: ${supplierAddress}</p>
        </div>
        <div class="party">
          <h3>CUMPĂRĂTOR</h3>
          <p>Denumire: <strong>${customerName}</strong></p>
          <p>CUI/CIF: <strong>${customerCUI}</strong></p>
          <p>Adresă: ${customerAddress}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="center" style="border-radius: 8px 0 0 0; width: 50px;">Nr.</th>
            <th>Denumire Produs / Serviciu</th>
            <th class="right">Cantitate</th>
            <th class="right">Preț Unitar</th>
            <th class="center">Cota TVA</th>
            <th class="right" style="border-radius: 0 8px 0 0;">Valoare Netă</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row">
          <span>Total Net</span>
          <strong>${taxExclusiveAmount} ${currency}</strong>
        </div>
        <div class="totals-row">
          <span>Total TVA</span>
          <strong>${taxTotalAmount} ${currency}</strong>
        </div>
        <div class="totals-row">
          <span>Total de Plată</span>
          <span>${payableAmount} ${currency}</span>
        </div>
      </div>

      <div class="footer">
        Generat automat din E-Factura (UBL 2.1) prin Agency OS
      </div>
    </body>
    </html>
  `

  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  })
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'domcontentloaded' })
  
  const pdfBuffer = await page.pdf({ 
    format: 'A4',
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
  })
  await browser.close()
  return Buffer.from(pdfBuffer)
}
