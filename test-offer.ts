import { db } from '@repo/db'

async function run() {
  const offer = await db.offer.findUnique({ where: { number: 'OFE-DAVID-001' } })
  console.log('Offer:', offer)
  const bl = await db.businessLine.findUnique({ where: { id: offer?.businessLineId } })
  console.log('Business Line:', bl)
}
run()
