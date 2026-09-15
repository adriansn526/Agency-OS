import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://agency_os:AgencyOS_2026!Secure@localhost:5434/agency_os?schema=public"
    }
  }
})

async function main() {
  console.log('🧹 Începem ștergerea strictă a clienților mock...')

  const keepClients = ['Tentrom Paradise SRL', 'Advanced Systems', 'Marystelv SRL']
  
  const allClients = await prisma.client.findMany()
  console.log('Clienți înainte de ștergere:', allClients.map(c => c.companyName))
  
  const mockClients = allClients.filter(c => !keepClients.includes(c.companyName))
  const mockClientIds = mockClients.map(c => c.id)

  if (mockClientIds.length > 0) {
    await prisma.project.deleteMany({ where: { clientId: { in: mockClientIds } } })
    await prisma.invoice.deleteMany({ where: { clientId: { in: mockClientIds } } })
    await prisma.retainer.deleteMany({ where: { clientId: { in: mockClientIds } } })
    await prisma.contract.deleteMany({ where: { clientId: { in: mockClientIds } } })
    await prisma.clientDomainConfig.deleteMany({ where: { clientId: { in: mockClientIds } } })
    await prisma.clientApiKey.deleteMany({ where: { clientId: { in: mockClientIds } } })
    await prisma.clientReport.deleteMany({ where: { clientId: { in: mockClientIds } } })

    const deletedClients = await prisma.client.deleteMany({
      where: { id: { in: mockClientIds } }
    })
    console.log(`✅ Am șters ${deletedClients.count} clienți mock (și datele lor).`)
  } else {
    console.log(`✅ Niciun client mock de șters.`)
  }

  const afterClients = await prisma.client.findMany()
  console.log('Clienți RĂMAȘI în baza de date:', afterClients.map(c => c.companyName))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
