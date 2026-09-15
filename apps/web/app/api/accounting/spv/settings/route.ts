import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const settings = await db.anafSettings.findUnique({
      where: { tenantId: tenant.id }
    })

    if (!settings) {
      return NextResponse.json({ data: null })
    }

    // Mask the client secret for security, only send if it exists
    return NextResponse.json({
      data: {
        clientId: settings.clientId,
        clientSecret: settings.clientSecret ? '********' : '', // Don't expose actual secret
        accessToken: settings.accessToken ? true : false,
        expiresAt: settings.expiresAt
      }
    })
  } catch (error) {
    console.error('[SPV Settings GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
