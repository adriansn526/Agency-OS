import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

type Params = { params: Promise<{ id: string }> }

// GET /api/services/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    const service = await db.serviceTemplate.findUnique({
      where: { id },
      include: { businessLine: { select: { slug: true, name: true, color: true } } },
    })
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    return NextResponse.json({ data: service })
  } catch (error) {
    console.error('GET /api/services/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch service' }, { status: 500 })
  }
}

// PATCH /api/services/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    const body = await request.json()
    const service = await db.serviceTemplate.update({ where: { id }, data: body })
    return NextResponse.json({ data: service })
  } catch (error) {
    console.error('PATCH /api/services/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 })
  }
}

// DELETE /api/services/[id] — soft delete (deactivate)
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    const service = await db.serviceTemplate.update({
      where: { id },
      data: { isActive: false },
    })
    return NextResponse.json({ data: service })
  } catch (error) {
    console.error('DELETE /api/services/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 })
  }
}
