import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@repo/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const logs = await db.spvSyncLog.findMany({
      where: { tenantId: tenant.id },
      orderBy: { startedAt: 'desc' },
      skip,
      take: limit
    })

    const total = await db.spvSyncLog.count({ where: { tenantId: tenant.id } })

    return NextResponse.json({
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error: any) {
    console.error('[SPV Sync History API]', error)
    return NextResponse.json({ error: 'Eroare la preluarea istoricului SPV.' }, { status: 500 })
  }
}
