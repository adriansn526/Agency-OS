import { db } from '@repo/db'

async function run() {
  const offer = await db.offer.findUnique({
    where: { id: 'cmu6wwxho0005mbvvby557of2' },
  })
  console.log(JSON.stringify(offer, null, 2))
}
run()
