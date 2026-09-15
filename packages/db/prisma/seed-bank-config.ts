import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Recreăm configurația bancară și de tenant...')

  let tenant = await prisma.tenantInstance.findFirst()
  if (!tenant) {
    tenant = await prisma.tenantInstance.create({
      data: {
        tenantId: 'agency-os-default',
        tenantName: 'Agency OS',
        tenantSlug: 'agency-os'
      }
    })
    console.log(`✅ Adăugat tenant: ${tenant.tenantName}`)
  }

  let bank = await prisma.bankConnection.findFirst()
  if (!bank) {
    bank = await prisma.bankConnection.create({
      data: {
        tenantId: tenant.id,
        bankName: 'Banca Transilvania',
        accountIban: 'RO99BTRL1111222233334444', // IBAN dummy pt test
        statementPasswordEnvKey: 'BT_STATEMENT_PASSWORD'
      }
    })
    console.log(`✅ Adăugat conexiune bancară pentru: ${bank.bankName}`)
  } else {
    // update password key to make sure it's correct
    await prisma.bankConnection.update({
      where: { id: bank.id },
      data: { statementPasswordEnvKey: 'BT_STATEMENT_PASSWORD' }
    })
    console.log(`✅ Actualizat conexiune bancară existentă.`)
  }

  console.log('🎉 Gata!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
