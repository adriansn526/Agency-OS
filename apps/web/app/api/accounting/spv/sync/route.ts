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

    const result = await syncSpvForTenant(tenant.id)
    
    return NextResponse.json({ 
      success: true, 
      message: `Sincronizare finalizată. ${result.processed} facturi noi adăugate, ${result.skipped} ignorate (existente).`,
      details: result
    })

  } catch (error: any) {
    console.error('[SPV Sync API]', error)
    return NextResponse.json({ error: error.message || 'Eroare la sincronizarea cu SPV ANAF.' }, { status: 500 })
  }
}
