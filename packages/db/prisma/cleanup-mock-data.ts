import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Începem ștergerea datelor de mock...')

  // Ștergem lead-urile de mock (care nu sunt din importul csv)
  const deletedLeads = await prisma.lead.deleteMany({
    where: {
      source: { not: 'csv_import' }
    }
  })
  console.log(`✅ Am șters ${deletedLeads.count} lead-uri mock.`)

  // Ștergem facturile mock și contractele/abonamentele dacă există
  // Mai întâi facturi și retainers
  const deletedInvoices = await prisma.invoice.deleteMany({})
  console.log(`✅ Am șters ${deletedInvoices.count} facturi mock.`)
  
  const deletedRetainers = await prisma.retainer.deleteMany({})
  console.log(`✅ Am șters ${deletedRetainers.count} abonamente mock.`)

  const deletedContracts = await prisma.contract.deleteMany({})
  console.log(`✅ Am șters ${deletedContracts.count} contracte mock.`)

  // Clienții reali pe care vrem să îi păstrăm
  const keepClients = ['Tentrom Paradise SRL', 'Advanced Systems', 'Marystelv SRL']

  // Pentru clienții mock, Prisma va șterge automat și proiectele și site-urile lor 
  // datorită relațiilor onDelete: Cascade, dar să ne asigurăm.
  const deletedClients = await prisma.client.deleteMany({
    where: {
      companyName: {
        notIn: keepClients
      }
    }
  })
  console.log(`✅ Am șters ${deletedClients.count} clienți mock (și datele lor asociate).`)

  console.log('🎉 Curățenie finalizată! Au rămas doar datele reale.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
