import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@repo/db'

// GET /api/reports/domains - List all configured domains
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const configs = await db.clientDomainConfig.findMany({
      include: {
        client: { select: { id: true, companyName: true } },
      },
      orderBy: { domain: 'asc' },
    })

    const domains = configs.map(c => ({
      domain: c.domain,
      clientId: c.clientId,
      clientName: c.client?.companyName || c.domain,
      gscSiteUrl: c.gscSiteUrl || '',
      googleAdsCustomerId: c.googleAdsCustomerId || '',
    }))

    return NextResponse.json(domains)
  } catch (err: any) {
    console.error('[Domains API] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
