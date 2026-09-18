import { db } from '@repo/db'

async function run() {
  const page = 1, limit = 100
  const businessLineId = 'cmu1fxmtb0000mba4zjjry64b'
  
  const where: any = {}
  if (businessLineId) {
    const bl = await db.businessLine.findFirst({ where: { OR: [{ id: businessLineId }, { slug: businessLineId }] } })
    if (bl) {
      where.businessLineId = bl.id
    }
  }

  const [total, offers] = await Promise.all([
    db.offer.count({ where }),
    db.offer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        businessLine: { select: { id: true, slug: true, name: true } },
        client: { select: { id: true, companyName: true, contactPerson: true, email: true } },
        _count: { select: { contracts: true } },
      },
    }),
  ])
  
  console.log('Total found:', total)
  console.log('Offers mapped length:', offers.length)
  console.log('Sample mapped businessLine:', offers[0]?.businessLine.id)
}
run()
