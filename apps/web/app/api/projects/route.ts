import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/projects ───
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessLine = searchParams.get('businessLine')
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const assignedTo = searchParams.get('assignedTo')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sort = searchParams.get('sort') || 'updatedAt'
    const order = searchParams.get('order') || 'desc'

    const where: Record<string, unknown> = {}
    if (businessLine) {
      const bl = await db.businessLine.findUnique({ where: { slug: businessLine } })
      if (bl) where.businessLineId = bl.id
    }
    if (status) where.status = status
    if (clientId) where.clientId = clientId
    const templateId = searchParams.get('templateId')
    if (templateId) where.templateId = templateId
    if (assignedTo) where.assignedTo = assignedTo
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { client: { companyName: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [data, total] = await Promise.all([
      db.project.findMany({
        where: where as any,
        include: {
          businessLine: { select: { slug: true, name: true, icon: true, color: true } },
          client: { select: { id: true, companyName: true, contactPerson: true } },
        },
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.project.count({ where: where as any }),
    ])

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('[API] GET /api/projects error:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

// ─── POST /api/projects ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessLineSlug, clientId, templateId, name, startDate, dueDate, budget, assignedTo, metadata } = body

    if (!businessLineSlug || !clientId || !templateId || !name) {
      return NextResponse.json({ error: 'Missing required fields: businessLineSlug, clientId, templateId, name' }, { status: 400 })
    }

    const bl = await db.businessLine.findUnique({ where: { slug: businessLineSlug } })
    if (!bl) return NextResponse.json({ error: 'Business line not found' }, { status: 404 })

    const client = await db.client.findUnique({ where: { id: clientId } })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    // Build phases & checklist from template config if available
    const blConfig = bl.config as any
    const template = blConfig?.projectTemplates?.find((t: any) => t.id === templateId)
    const projectMetadata = metadata || {
      viewType: template?.viewType || 'timeline',
      phases: template?.phases?.map((p: string) => ({ name: p, status: 'pending', completedAt: null })) || [],
      checklist: template?.checklist?.map((item: string) => ({ item, done: false })) || [],
      kpis: template?.kpis?.map((k: string) => ({ label: k, value: '—', target: '—' })) || [],
    }

    const project = await db.project.create({
      data: {
        businessLineId: bl.id,
        clientId,
        templateId,
        name,
        status: 'planificare',
        currentPhase: projectMetadata.phases?.[0]?.name || null,
        progress: 0,
        startDate: startDate ? new Date(startDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        budget: budget || null,
        assignedTo: assignedTo || null,
        metadata: projectMetadata,
      },
      include: {
        businessLine: { select: { slug: true, name: true } },
        client: { select: { id: true, companyName: true } },
      },
    })

    db.activity.create({
      data: {
        businessLineId: bl.id,
        userId: 'system', userName: 'System',
        action: 'created',
        entityType: 'project', entityId: project.id, entityName: name,
        projectId: project.id, clientId,
      },
    }).catch(console.error)

    return NextResponse.json({ data: project }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/projects error:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
