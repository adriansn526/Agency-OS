import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Începem recuperarea clienților reali...')

  const agency = await prisma.businessLine.findUnique({ where: { slug: 'agency' } })
  if (!agency) throw new Error('Nu am găsit linia de business "agency".')

  // 1. Tentrom Paradise SRL
  const tentrom = await prisma.client.create({
    data: {
      businessLineId: agency.id,
      entityType: 'clients',
      companyName: 'Tentrom Paradise SRL',
      contactPerson: 'Reprezentant Tentrom',
      email: 'contact@inchideriterase.ro',
      status: 'activ',
      industry: 'Construcții',
      websites: ["inchideriterase.ro"],
      projects: {
        create: [
          {
            businessLineId: agency.id,
            templateId: 'seo_project',
            name: 'SEO - inchideriterase.ro',
            status: 'in_lucru',
            currentPhase: 'Optimizare On-Page',
            progress: 65,
          },
          {
            businessLineId: agency.id,
            templateId: 'google_ads',
            name: 'Google Ads - inchideriterase.ro',
            status: 'in_lucru',
            currentPhase: 'Campanii',
            progress: 80,
          },
          {
            businessLineId: agency.id,
            templateId: 'website',
            name: 'Dezvoltare Web - inchideriterase.ro',
            status: 'in_lucru',
            currentPhase: 'Development',
            progress: 50,
          }
        ]
      }
    }
  })
  
  await prisma.clientDomainConfig.create({
    data: {
      clientId: tentrom.id,
      domain: 'inchideriterase.ro',
      gscSiteUrl: 'sc-domain:inchideriterase.ro'
    }
  })
  console.log(`✅ Adăugat: ${tentrom.companyName}`)

  // 2. Marystelv SRL
  const marystelv = await prisma.client.create({
    data: {
      businessLineId: agency.id,
      entityType: 'clients',
      companyName: 'Marystelv SRL',
      contactPerson: 'Reprezentant Marystelv',
      email: 'contact@qualitycontrol.com.ro',
      status: 'activ',
      industry: 'Servicii',
      websites: ["qualitycontrol.com.ro"],
      projects: {
        create: [
          {
            businessLineId: agency.id,
            templateId: 'seo_project',
            name: 'SEO - qualitycontrol.com.ro',
            status: 'in_lucru',
            currentPhase: 'Audit',
            progress: 25,
          }
        ]
      }
    }
  })
  await prisma.clientDomainConfig.create({
    data: {
      clientId: marystelv.id,
      domain: 'qualitycontrol.com.ro',
      gscSiteUrl: 'sc-domain:qualitycontrol.com.ro'
    }
  })
  console.log(`✅ Adăugat: ${marystelv.companyName}`)

  // 3. Advanced Systems 
  let advanced = await prisma.client.findFirst({
    where: { companyName: 'Advanced Systems' }
  })
  
  if (!advanced) {
    advanced = await prisma.client.create({
      data: {
        businessLineId: agency.id,
        entityType: 'clients',
        companyName: 'Advanced Systems',
        contactPerson: 'Adrian',
        email: 'adrian@asns.ro',
        status: 'activ',
        websites: ['centruldemobila.ro', 'omniamed.ro', 'intraconstruct.ro']
      }
    })
  } else {
    // update websites array
    await prisma.client.update({
      where: { id: advanced.id },
      data: {
        websites: {
          push: ['centruldemobila.ro', 'omniamed.ro', 'intraconstruct.ro']
        }
      }
    })
  }

  // Create configs for Advanced
  for (const domain of ['centruldemobila.ro', 'omniamed.ro', 'intraconstruct.ro']) {
    const existingConfig = await prisma.clientDomainConfig.findFirst({
      where: { clientId: advanced.id, domain }
    })
    if (!existingConfig) {
      await prisma.clientDomainConfig.create({
        data: {
          clientId: advanced.id,
          domain,
          gscSiteUrl: `sc-domain:${domain}`
        }
      })
      console.log(`✅ Configurat domeniu: ${domain}`)
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
