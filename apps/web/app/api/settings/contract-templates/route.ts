import { NextRequest, NextResponse } from 'next/server'
import { db } from "@repo/db"

// ─── GET /api/settings/contract-templates ───
export async function GET() {
  try {
    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const templates = await db.contractTemplate.findMany({
      where: { tenantId: tenant.id },
      include: {
        businessLines: {
          select: {
            id: true,
            slug: true,
            name: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ data: templates })
  } catch (error) {
    console.error('[API] GET /api/settings/contract-templates error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract templates' },
      { status: 500 }
    )
  }
}

// ─── POST /api/settings/contract-templates ───
export async function POST(req: NextRequest) {
  try {
    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    const body = await req.json()
    const { name, description, isGlobal, businessLines, sections, anexa2, isDefault } = body

    if (!name || !sections || !Array.isArray(sections)) {
      return NextResponse.json({ error: 'Numele și secțiunile sunt obligatorii.' }, { status: 400 })
    }

    if (isDefault) {
      await db.contractTemplate.updateMany({
        where: { tenantId: tenant.id, isDefault: true },
        data: { isDefault: false }
      })
    }

    const newTemplate = await db.contractTemplate.create({
      data: {
        tenantId: tenant.id,
        name: name.trim(),
        description: description?.trim() || null,
        isGlobal: typeof isGlobal === 'boolean' ? isGlobal : true,
        businessLines: (isGlobal !== true && Array.isArray(businessLines) && businessLines.length > 0) ? {
          connect: businessLines.map((id: string) => ({ id }))
        } : undefined,
        sections,
        anexa2: anexa2 || null,
        isDefault: !!isDefault
      },
      include: {
        businessLines: true
      }
    })

    return NextResponse.json({ data: newTemplate }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/settings/contract-templates error:', error)
    return NextResponse.json(
      { error: 'Failed to create contract template' },
      { status: 500 }
    )
  }
}

// ─── PATCH /api/settings/contract-templates ───
export async function PATCH(req: NextRequest) {
  try {
    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    const body = await req.json()
    const { id, name, description, isGlobal, businessLines, sections, anexa2, isDefault } = body

    if (!id) {
      return NextResponse.json({ error: 'ID-ul șablonului este obligatoriu.' }, { status: 400 })
    }

    const existing = await db.contractTemplate.findFirst({
      where: { id, tenantId: tenant.id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Șablonul nu a fost găsit.' }, { status: 404 })
    }

    if (isDefault) {
      await db.contractTemplate.updateMany({
        where: { tenantId: tenant.id, isDefault: true, id: { not: id } },
        data: { isDefault: false }
      })
    }

    // Prepare connection logic for many-to-many
    let businessLinesUpdate = undefined
    if (typeof isGlobal === 'boolean') {
      if (isGlobal === true) {
        businessLinesUpdate = { set: [] }
      } else if (Array.isArray(businessLines)) {
        businessLinesUpdate = { set: businessLines.map((bId: string) => ({ id: bId })) }
      }
    }

    const updated = await db.contractTemplate.update({
      where: { id },
      data: {
        name: name?.trim(),
        description: description?.trim(),
        isGlobal: isGlobal,
        businessLines: businessLinesUpdate,
        sections: sections,
        anexa2: anexa2,
        isDefault: isDefault !== undefined ? !!isDefault : undefined
      },
      include: {
        businessLines: true
      }
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('[API] PATCH /api/settings/contract-templates error:', error)
    return NextResponse.json(
      { error: 'Failed to update contract template' },
      { status: 500 }
    )
  }
}

// ─── DELETE /api/settings/contract-templates ───
export async function DELETE(request: NextRequest) {
  try {
    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id query param' }, { status: 400 })

    const existing = await db.contractTemplate.findFirst({
      where: { id, tenantId: tenant.id }
    })
    if (!existing) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    const totalCount = await db.contractTemplate.count({
      where: { tenantId: tenant.id }
    })
    if (totalCount <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last template' }, { status: 400 })
    }

    await db.contractTemplate.delete({ where: { id } })

    // If deleted was default, make the most recent one default
    if (existing.isDefault) {
      const latest = await db.contractTemplate.findFirst({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: 'desc' }
      })
      if (latest) {
        await db.contractTemplate.update({
          where: { id: latest.id },
          data: { isDefault: true }
        })
      }
    }

    return NextResponse.json({ message: 'Template deleted' })
  } catch (error) {
    console.error('[API] DELETE /api/settings/contract-templates error:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}
