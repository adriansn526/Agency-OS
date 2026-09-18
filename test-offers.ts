import { db } from '@repo/db'

async function run() {
  const businessLineId = 'cmu1fxmtb0000mba4zjjry64b'
  const where = { businessLineId }
  const total = await db.offer.count({ where })
  const offers = await db.offer.findMany({
    where,
    include: {
      businessLine: { select: { id: true, slug: true, name: true } }
    }
  })
  console.log('Total:', total)
  console.log('Data:', offers.map(o => o.businessLine.id))
}
run()
