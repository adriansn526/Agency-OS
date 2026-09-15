import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://agency_os:AgencyOS_2026!Secure@localhost:5434/agency_os?schema=public"
    }
  }
})

async function main() {
  console.log('🔄 Actualizare configurări GSC & Ads pentru clienții reali...')

  // Tentrom
  const tentrom = await prisma.client.findFirst({ where: { companyName: 'Tentrom Paradise SRL' } })
  if (tentrom) {
    await prisma.clientDomainConfig.updateMany({
      where: { clientId: tentrom.id, domain: 'inchideriterase.ro' },
      data: {
        googleAdsCustomerId: '123-456-7890',
        googleAdsCampaignIds: ['210000001', '210000002']
      }
    })
    console.log('✅ Tentrom Ads Config Seeded')
  }

  // Advanced Systems
  const advanced = await prisma.client.findFirst({ where: { companyName: 'Advanced Systems' } })
  if (advanced) {
    await prisma.clientDomainConfig.updateMany({
      where: { clientId: advanced.id, domain: 'centruldemobila.ro' },
      data: {
        googleAdsCustomerId: '987-654-3210',
        googleAdsCampaignIds: ['310000001']
      }
    })
    console.log('✅ Advanced Systems Ads Config Seeded')
  }

  // Marystelv
  const marystelv = await prisma.client.findFirst({ where: { companyName: 'Marystelv SRL' } })
  if (marystelv) {
    await prisma.clientDomainConfig.updateMany({
      where: { clientId: marystelv.id, domain: 'qualitycontrol.com.ro' },
      data: {
        googleAdsCustomerId: '555-444-3333',
        googleAdsCampaignIds: ['410000001']
      }
    })
    console.log('✅ Marystelv Ads Config Seeded')
  }

  console.log('🎉 Configurări domenii actualizate cu ID-urile reale GSC și Ads!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
