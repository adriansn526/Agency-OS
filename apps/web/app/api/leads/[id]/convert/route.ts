import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── POST /api/leads/[id]/convert ───
// Conversie Lead → Client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { keepLead = true, clientData = {}, createProject } = body

    const lead = await db.lead.findUnique({
      where: { id },
      include: { businessLine: { select: { slug: true, name: true } } },
    })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    // Create client from lead data
    const client = await db.client.create({
      data: {
        businessLineId: lead.businessLineId,
        entityType: lead.entityType,
        companyName: lead.companyName,
        contactPerson: lead.contactPerson,
        email: lead.email,
        phone: lead.phone,
        status: 'activ',
        customFields: lead.customFields as any,
        ...clientData,
      },
    })

    // Update lead — mark as converted
    if (keepLead) {
      await db.lead.update({
        where: { id },
        data: { status: 'castigat', convertedToId: client.id },
      })
    } else {
      await db.lead.delete({ where: { id } })
    }

    // Optionally create project
    let project = null
    if (createProject?.templateId && createProject?.name) {
      project = await db.project.create({
        data: {
          businessLineId: lead.businessLineId,
          clientId: client.id,
          templateId: createProject.templateId,
          name: createProject.name,
          status: 'planificare',
          progress: 0,
          startDate: new Date(),
        },
      })
    }

    // Log conversion
    db.activity.create({
      data: {
        businessLineId: lead.businessLineId,
        userId: 'system', userName: 'System',
        action: 'converted',
        entityType: 'lead', entityId: id, entityName: lead.companyName,
        details: { convertedToClientId: client.id, projectCreated: !!project },
        leadId: id, clientId: client.id,
      },
    }).catch(console.error)

    return NextResponse.json({
      data: { client, project },
      message: `Lead "${lead.companyName}" converted to client successfully`,
    }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/leads/[id]/convert error:', error)
    return NextResponse.json({ error: 'Failed to convert lead' }, { status: 500 })
  }
}
