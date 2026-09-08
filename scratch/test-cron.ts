import { GET } from '../apps/web/app/api/cron/seo-reports/route'
import { NextRequest } from 'next/server'

async function run() {
  const req = new NextRequest('http://localhost/api/cron/seo-reports?force=true')
  const res = await GET(req)
  const json = await res.json()
  console.log(JSON.stringify(json, null, 2))
}

run().catch(console.error)
