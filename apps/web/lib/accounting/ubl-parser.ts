import AdmZip from 'adm-zip'
import { XMLParser } from 'fast-xml-parser'

export interface ParsedEFactura {
  cuiFurnizor: string
  numeFurnizor: string
  cuiClient: string
  numeClient: string
  numarFactura: string
  dataEmitere: Date
  sumaNeta: number
  sumaTva: number
  total: number
  moneda: string
  contractReference?: string
  rawXml: string
}

export function parseEFacturaZip(zipBuffer: Buffer): ParsedEFactura {
  // 1. Unzip the file and find the actual XML (ignoring the signature XML)
  const zip = new AdmZip(zipBuffer)
  const zipEntries = zip.getEntries()

  let xmlContent = ''
  for (const entry of zipEntries) {
    if (!entry.isDirectory && entry.entryName.endsWith('.xml') && !entry.entryName.toLowerCase().includes('semnatura')) {
      xmlContent = entry.getData().toString('utf8')
      break
    }
  }

  if (!xmlContent) {
    throw new Error('Nu am găsit un fișier XML valid în arhiva descărcată din SPV.')
  }

  // 2. Parse UBL 2.1 XML
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true, // Scoate prefixele gen cac:, cbc: pentru a face JSON-ul mai usor de citit
    parseTagValue: false
  })
  
  const jsonObj = parser.parse(xmlContent)
  const invoice = jsonObj.Invoice
  
  if (!invoice) {
    throw new Error('Structura XML nu conține nodul Invoice (nu este un UBL valid).')
  }

  // 3. Extragere date principale
  const numarFactura = invoice.ID
  const dataEmitere = new Date(invoice.IssueDate)
  const moneda = invoice.DocumentCurrencyCode || 'RON'

  // AccountingSupplierParty -> Party
  const supplierParty = invoice.AccountingSupplierParty?.Party
  const numeFurnizor = supplierParty?.PartyName?.Name || supplierParty?.PartyLegalEntity?.RegistrationName || 'Furnizor Necunoscut'
  
  let cuiFurnizor = supplierParty?.PartyTaxScheme?.CompanyID || supplierParty?.PartyIdentification?.ID
  if (Array.isArray(cuiFurnizor)) cuiFurnizor = cuiFurnizor[0]
  if (typeof cuiFurnizor === 'object' && cuiFurnizor['#text']) cuiFurnizor = cuiFurnizor['#text']

  // AccountingCustomerParty -> Party
  const customerParty = invoice.AccountingCustomerParty?.Party
  const numeClient = customerParty?.PartyName?.Name || customerParty?.PartyLegalEntity?.RegistrationName || 'Client Necunoscut'
  
  let cuiClient = customerParty?.PartyTaxScheme?.CompanyID || customerParty?.PartyIdentification?.ID
  if (Array.isArray(cuiClient)) cuiClient = cuiClient[0]
  if (typeof cuiClient === 'object' && cuiClient['#text']) cuiClient = cuiClient['#text']

  cuiFurnizor = (cuiFurnizor || '').toString().replace(/[^A-Z0-9]/gi, '') // RO123456 -> RO123456

  // LegalMonetaryTotal
  const totals = invoice.LegalMonetaryTotal
  const sumaNeta = parseFloat(totals?.TaxExclusiveAmount?.['#text'] || totals?.TaxExclusiveAmount || 0)
  const total = parseFloat(totals?.TaxInclusiveAmount?.['#text'] || totals?.TaxInclusiveAmount || 0)
  
  // TaxTotal
  let sumaTva = 0
  if (invoice.TaxTotal) {
    const taxTotal = Array.isArray(invoice.TaxTotal) ? invoice.TaxTotal[0] : invoice.TaxTotal
    sumaTva = parseFloat(taxTotal?.TaxAmount?.['#text'] || taxTotal?.TaxAmount || 0)
  }

  // Contract/Order Reference
  let contractReference = undefined
  if (invoice.ContractDocumentReference?.ID) {
    contractReference = invoice.ContractDocumentReference.ID?.['#text'] || invoice.ContractDocumentReference.ID
  } else if (invoice.OrderReference?.ID) {
    contractReference = invoice.OrderReference.ID?.['#text'] || invoice.OrderReference.ID
  }

  return {
    numeFurnizor,
    cuiFurnizor: String(cuiFurnizor || '').trim(),
    numeClient,
    cuiClient: String(cuiClient || '').trim(),
    numarFactura,
    dataEmitere,
    sumaNeta,
    sumaTva,
    total,
    moneda,
    contractReference,
    rawXml: xmlContent
  }
}
