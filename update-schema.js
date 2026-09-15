const fs = require('fs')

let schema = fs.readFileSync('packages/db/prisma/schema.prisma', 'utf8')

// 1. Add AnafSettings to TenantInstance
if (!schema.includes('anafSettings')) {
  schema = schema.replace(
    /accountingSettings AccountingSettings\[\]/,
    'accountingSettings AccountingSettings[]\n  anafSettings       AnafSettings?'
  )
}

// 2. Add SPV fields to SupplierInvoice
if (!schema.includes('spvId')) {
  schema = schema.replace(
    /extractedSupplierName String\? \/\/ Numele detectat de LLM pentru facturile orfane/,
    '// SPV Tracking\n  spvId                 String?   @unique         // ID-ul descarcarii din ANAF\n  xmlData               String?                   // Fisierul UBL 2.1 brut\n\n  extractedSupplierName String? // Numele detectat de LLM pentru facturile orfane'
  )
}

// 3. Add AnafSettings model at the end
if (!schema.includes('model AnafSettings')) {
  schema += `\n\nmodel AnafSettings {
  id           String    @id @default(cuid())
  tenantId     String    @unique
  clientId     String
  clientSecret String
  accessToken  String?
  refreshToken String?
  expiresAt    DateTime?
  updatedAt    DateTime  @updatedAt

  tenant       TenantInstance @relation(fields: [tenantId], references: [id])
}\n`
}

fs.writeFileSync('packages/db/prisma/schema.prisma', schema)
console.log('Schema updated successfully.')
