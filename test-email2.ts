import { db } from './packages/db/index'

async function run() {
  const report = await db.clientReport.findFirst({
    where: { token: 'cmqay95fg0003mb16y4q8sio9' }
  })
  
  if (!report) {
    console.log("Report not found")
    process.exit(1)
  }
  
  console.log("Report ID:", report.id)
}
run()
