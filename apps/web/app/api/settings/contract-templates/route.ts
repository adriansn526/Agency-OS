import { NextRequest, NextResponse } from 'next/server'
import { db } from '@agency-os/db'

// ─── GET /api/settings/contract-templates ───
export async function GET() {
  try {
    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const templates = await db.contractTemplate.findMany({
      where: { tenantId: tenant.id },
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
export async function POST(request: NextRequest) {
  try {
    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const body = await request.json()
    const { name, description, businessLines, sections, anexa2, isDefault } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 })
    }

    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      return NextResponse.json({ error: 'Missing required field: sections (must be non-empty array)' }, { status: 400 })
    }

    // Validation
    for (const s of sections) {
      if (!s.id || !s.title || typeof s.content !== 'string') {
        return NextResponse.json({ error: 'Invalid section: each must have id, title, content' }, { status: 400 })
      }
    }

    // If setting as default, unset others
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
        businessLines: Array.isArray(businessLines) && businessLines.length > 0 ? businessLines : ['*'],
        sections,
        anexa2: anexa2 || null,
        isDefault: !!isDefault
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
export async function PATCH(request: NextRequest) {
  try {
    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const body = await request.json()
    const { id, name, description, businessLines, sections, anexa2, isDefault } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 })
    }

    const existing = await db.contractTemplate.findFirst({
      where: { id, tenantId: tenant.id }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (sections && Array.isArray(sections)) {
      for (const s of sections) {
        if (!s.id || !s.title || typeof s.content !== 'string') {
          return NextResponse.json({ error: 'Invalid section: each must have id, title, content' }, { status: 400 })
        }
      }
    }

    if (isDefault) {
      await db.contractTemplate.updateMany({
        where: { tenantId: tenant.id, id: { not: id }, isDefault: true },
        data: { isDefault: false }
      })
    }

    const updatedTemplate = await db.contractTemplate.update({
      where: { id },
      data: {
        name: name !== undefined ? String(name).trim() : undefined,
        description: description !== undefined ? String(description).trim() : undefined,
        businessLines: businessLines !== undefined && Array.isArray(businessLines) ? businessLines : undefined,
        sections: sections !== undefined ? sections : undefined,
        anexa2: anexa2 !== undefined ? anexa2 : undefined,
        isDefault: isDefault !== undefined ? !!isDefault : undefined
      }
    })

    return NextResponse.json({ data: updatedTemplate })
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
