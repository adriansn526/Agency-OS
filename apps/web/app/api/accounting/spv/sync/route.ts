import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@repo/db'
import { syncSpvForTenant } from '@/lib/accounting/spv-sync'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    let days = 60
    try {
      const body = await request.json()
      if (body.days) {
        days = parseInt(body.days)
      }
    } catch(e) {} // ignore json parse errors for empty bodies

    if (isNaN(days) || days < 1 || days > 60) {
      return NextResponse.json({ error: 'Limita legală ANAF este între 1 și 60 de zile.' }, { status: 400 })
    }

    const result = await syncSpvForTenant(tenant.id, days, session.user.id)
    
    return NextResponse.json({ 
      success: true, 
      message: `Sincronizare finalizată. ${result.processed} noi, ${result.skipped} ignorate, ${result.errors} erori.`,
      details: result
    })

  } catch (error: any) {
    console.error('[SPV Sync API]', error)
    return NextResponse.json({ error: error.message || 'Eroare la sincronizarea cu SPV ANAF.' }, { status: 500 })
  }
}
