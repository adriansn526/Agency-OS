import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  const fudly = await db.businessLine.findUnique({ where: { slug: 'fudly' } })
  if (!fudly) { console.log('Fudly BL not found'); return }

  // 1. Create or find test lead
  let lead = await db.lead.findFirst({ where: { businessLineId: fudly.id, phone: '0731156333' } })
  
  if (!lead) {
    lead = await db.lead.create({
      data: {
        businessLineId: fudly.id,
        companyName: 'Test Restaurant SRL',
        contactPerson: 'Adrian',
        phone: '0731156333',
        email: 'test@fudly.ro',
        city: 'București',
        county: 'București',
        industry: 'restaurant',
        source: 'manual',
        status: 'new',
        entityType: 'company',
      }
    })
    console.log('Created test lead:', lead.id)
  } else {
    console.log('Lead already exists:', lead.id)
  }

  // 2. Create test segment
  const segment = await db.marketingSegment.create({
    data: {
      businessLineId: fudly.id,
      name: '🧪 Test — Adrian',
      description: 'Segment de test cu un singur lead (tel: 0731156333)',
      filters: [
        { field: 'phone', operator: 'equals', value: '0731156333' }
      ],
      leadCount: 1,
    }
  })
  console.log('Created segment:', segment.id, segment.name)
  console.log('Lead:', lead.companyName, '|', lead.phone)
}

main().catch(console.error).finally(() => db.$disconnect())
