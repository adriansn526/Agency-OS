import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { generateAndSendAccountingPackage } from '@/lib/accounting/packager'

export async function POST(request: NextRequest) {
  try {
    const { month } = await request.json()
    if (!month) return NextResponse.json({ error: 'Missing month' }, { status: 400 })

    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 400 })

    await generateAndSendAccountingPackage({ 
      tenantId: tenant.id, 
      month,
      skipValidation: false,
      sentBy: 'user-session-id' // ideal din context (clerk/next-auth)
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[AccountingSend]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
