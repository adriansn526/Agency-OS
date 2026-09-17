import { NextResponse } from 'next/server'
import { db, businessLineConfigSchema } from '@repo/db'

// ─── PATCH /api/settings/business-lines/[id] ───
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    
    // We expect { name, icon, color, config }
    const updateData: any = {}
    if (body.name) {
      updateData.name = body.name
      updateData.slug = body.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    }
    if (body.icon) updateData.icon = body.icon
    if (body.color) updateData.color = body.color
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    if (body.config) {
      updateData.config = businessLineConfigSchema.parse(body.config)
    }

    const updatedBL = await db.businessLine.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ data: updatedBL })
  } catch (error: any) {
    console.error(`[API] PATCH /api/settings/business-lines/[id] error:`, error)
    return NextResponse.json(
      { error: 'Failed to update business line', details: error?.issues || error.message },
      { status: 400 }
    )
  }
}

// ─── DELETE /api/settings/business-lines/[id] ───
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if it's referenced anywhere to decide if we can hard-delete
    // For now, to be safe, we just SOFT delete it
    // The user constraint was: "blochăm hard delete dacă are referințe, dar putem face isActive = false"
    // Since we don't know the full extent of references easily, soft-delete is standard
    
    const countClients = await db.client.count({ where: { businessLineId: id } })
    const countInvoices = await db.invoice.count({ where: { businessLineId: id } })
    const countLeads = await db.lead.count({ where: { businessLineId: id } })
    const countContracts = await db.contract.count({ where: { businessLineId: id } })

    const totalRefs = countClients + countInvoices + countLeads + countContracts

    if (totalRefs > 0) {
      // Has references, do SOFT delete
      const updated = await db.businessLine.update({
        where: { id },
        data: { isActive: false }
      })
      return NextResponse.json({ 
        data: updated, 
        message: 'Business Line soft-deleted (set isActive = false) because it has linked records.' 
      })
    } else {
      // Safe to hard delete
      await db.businessLine.delete({
        where: { id }
      })
      return NextResponse.json({ 
        message: 'Business Line hard-deleted successfully.' 
      })
    }
  } catch (error) {
    console.error(`[API] DELETE /api/settings/business-lines/[id] error:`, error)
    return NextResponse.json(
      { error: 'Failed to delete business line' },
      { status: 500 }
    )
  }
}
