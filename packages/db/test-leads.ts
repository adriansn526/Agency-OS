import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const leads = await prisma.lead.findMany({
    where: { sourceDomain: { contains: 'inchideriterase.ro' } },
    select: { id: true, sourceDomain: true, createdAt: true, source: true }
  })
  console.log("Leads with sourceDomain 'inchideriterase.ro':", leads.length)

  const leads2 = await prisma.lead.findMany({
    where: { companyName: { contains: 'inchideriterase' } },
    select: { id: true, sourceDomain: true, createdAt: true, source: true }
  })
  console.log("Leads with companyName 'inchideriterase':", leads2.length)
  
  const leads3 = await prisma.lead.findMany({
    where: { source: { contains: 'inchideriterase.ro' } },
    select: { id: true, sourceDomain: true, createdAt: true, source: true }
  })
  console.log("Leads with source 'inchideriterase.ro':", leads3.length)
  
  const allRecent = await prisma.lead.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, sourceDomain: true, source: true, email: true }
  })
  console.log("Recent leads sample:", allRecent)
}
main().catch(console.error).finally(() => prisma.$disconnect())
