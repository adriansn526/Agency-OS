import { db } from '@repo/db'
import { Prisma } from '@repo/db'

async function run() {
  const offer = await db.offer.findUnique({ where: { id: 'cmu6wwxho0005mbvvby557of2' } })
  if (!offer) return
  
  const modules = offer.modules as any[]
  if (modules && modules.length > 0) {
    modules[0].price = 850
    modules[1].price = 0
    modules[1].status = 'included_free'
  }
  
  await db.offer.update({
    where: { id: 'cmu6wwxho0005mbvvby557of2' },
    data: { value: 850, modules: modules as Prisma.InputJsonValue }
  })
}
run()
