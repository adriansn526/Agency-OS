import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { randomBytes } from 'crypto'

// ─── GET /api/marketing/campaigns/[id] ───
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const campaign = await db.marketingCampaign.findUnique({
      where: { id },
      include: {
        businessLine: { select: { slug: true, name: true } },
        segment: true,
        template: true,
        campaignLeads: {
          include: {
            lead: {
              select: {
                id: true, companyName: true, contactPerson: true,
                email: true, phone: true, city: true, county: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        _count: { select: { campaignLeads: true } },
      },
    })

    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    return NextResponse.json({ data: campaign })
  } catch (error) {
    console.error('[API] GET /api/marketing/campaigns/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 })
  }
}

// ─── PATCH /api/marketing/campaigns/[id] ───
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, status, scheduledAt, segmentId, templateId } = body

    const updateData: any = {}
    if (name) updateData.name = name
    if (status) updateData.status = status
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null
    if (segmentId !== undefined) updateData.segmentId = segmentId
    if (templateId) updateData.templateId = templateId

    const campaign = await db.marketingCampaign.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: campaign })
  } catch (error) {
    console.error('[API] PATCH /api/marketing/campaigns/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
  }
}

// ─── DELETE /api/marketing/campaigns/[id] ───
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Delete campaign leads first (cascade)
    await db.campaignLead.deleteMany({ where: { campaignId: id } })

    // Delete short links associated
    await db.shortLink.deleteMany({ where: { campaignId: id } })

    // Delete the campaign
    await db.marketingCampaign.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API] DELETE /api/marketing/campaigns/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 })
  }
}

// ─── POST /api/marketing/campaigns/[id]/generate ───
// Generates CampaignLead entries for each lead in the segment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    const campaign = await db.marketingCampaign.findUnique({
      where: { id },
      include: { segment: true, template: true, businessLine: true },
    })

    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    // ─── Action: generate ───
    if (action === 'generate') {
      if (!campaign.segmentId) {
        return NextResponse.json({ error: 'No segment assigned to this campaign' }, { status: 400 })
      }

      // Get leads matching segment filters
      const filters = campaign.segment!.filters as any[]
      const andConditions: any[] = [
        { businessLineId: campaign.businessLineId },
        { optOut: false },
        { deletedAt: null },
      ]

      if (Array.isArray(filters)) {
        for (const f of filters) {
          if (f.field && f.operator) {
            const condition = buildQuickFilter(f)
            if (condition) andConditions.push(condition)
          }
        }
      }

      const leads = await db.lead.findMany({
        where: { AND: andConditions } as any,
        select: {
          id: true, companyName: true, contactPerson: true,
          email: true, phone: true, city: true, county: true,
        },
      })

      // Check which leads are already in this campaign
      const existingLeadIds = new Set(
        (await db.campaignLead.findMany({
          where: { campaignId: id },
          select: { leadId: true },
        })).map(cl => cl.leadId)
      )

      const newLeads = leads.filter(l => !existingLeadIds.has(l.id))

      // ─── DEDUP: remove duplicate email/phone contacts ───
      // Prevents sending 56 identical SMS to Presto Pizza (same email/phone, many locations)
      const contactField = campaign.channel === 'sms' ? 'phone' : 'email'
      const seenContacts = new Set<string>()
      const uniqueLeads: typeof newLeads = []
      let dedupSkipped = 0

      for (const lead of newLeads) {
        const contactValue = (lead as any)[contactField]?.toLowerCase()?.trim()
        if (!contactValue || contactValue.includes('placeholder')) {
          dedupSkipped++
          continue // Skip leads without valid contact
        }
        if (seenContacts.has(contactValue)) {
          dedupSkipped++
          continue // Duplicate contact
        }
        seenContacts.add(contactValue)
        uniqueLeads.push(lead)
      }

      // ─── Generate CampaignLead entries with slugified unique codes ───
      const blDomain = campaign.businessLine?.domain || campaign.businessLine?.slug + '.ro'
      // Fetch ALL existing unique codes globally to prevent collisions
      const existingCodes = new Set(
        (await db.campaignLead.findMany({
          select: { uniqueCode: true },
        })).map(cl => cl.uniqueCode)
      )

      const campaignLeads = await Promise.all(
        uniqueLeads.map(async (lead) => {
          // Generate a slug-based unique code from company name
          let uniqueCode = slugify(lead.companyName || 'lead')
          // Ensure uniqueness by appending counter if needed
          let codeCandidate = uniqueCode
          let counter = 2
          while (existingCodes.has(codeCandidate)) {
            codeCandidate = `${uniqueCode}-${counter}`
            counter++
          }
          uniqueCode = codeCandidate
          existingCodes.add(uniqueCode)

          const lpLink = `https://${blDomain}/lp/${uniqueCode}`
          const messageBody = populateTemplate(
            campaign.template!.body, lead, campaign.businessLine!, uniqueCode, lpLink
          )

          return db.campaignLead.create({
            data: {
              campaignId: id,
              leadId: lead.id,
              uniqueCode,
              messageBody,
              status: 'pending',
            },
          })
        })
      )

      // Update campaign stats
      await db.marketingCampaign.update({
        where: { id },
        data: { totalLeads: existingLeadIds.size + uniqueLeads.length },
      })

      return NextResponse.json({
        data: {
          generated: campaignLeads.length,
          dedupSkipped,
          skipped: existingLeadIds.size,
          total: existingLeadIds.size + uniqueLeads.length,
        },
      })
    }

    // ─── Action: send ───
    if (action === 'send') {
      // Auto-generate if no campaign leads exist yet
      let pendingLeads = await db.campaignLead.findMany({
        where: { campaignId: id, status: 'pending' },
        include: { lead: true },
        take: 100,
      })

      if (pendingLeads.length === 0) {
        // Check if we have ANY campaign leads (maybe all are already sent)
        const totalCampaignLeads = await db.campaignLead.count({ where: { campaignId: id } })
        
        if (totalCampaignLeads === 0 && campaign.segmentId) {
          // No leads generated yet — auto-generate first
          console.log(`[Campaign] Auto-generating leads for campaign ${id}...`)
          
          const filters = campaign.segment!.filters as any[]
          const andConditions: any[] = [
            { businessLineId: campaign.businessLineId },
            { optOut: false },
            { deletedAt: null },
          ]

          if (Array.isArray(filters)) {
            for (const f of filters) {
              if (f.field && f.operator) {
                const condition = buildQuickFilter(f)
                if (condition) andConditions.push(condition)
              }
            }
          }

          const leads = await db.lead.findMany({
            where: { AND: andConditions } as any,
            select: {
              id: true, companyName: true, contactPerson: true,
              email: true, phone: true, city: true, county: true,
            },
          })

          // Dedup
          const contactField = campaign.channel === 'sms' ? 'phone' : 'email'
          const seenContacts = new Set<string>()
          const uniqueLeads: typeof leads = []
          for (const lead of leads) {
            const contactValue = (lead as any)[contactField]?.toLowerCase()?.trim()
            if (!contactValue || contactValue.includes('placeholder')) continue
            if (seenContacts.has(contactValue)) continue
            seenContacts.add(contactValue)
            uniqueLeads.push(lead)
          }

          const blDomain = campaign.businessLine?.domain || campaign.businessLine?.slug + '.ro'
          // Fetch ALL existing unique codes (global, not just this campaign) to prevent collisions
          const existingCodes = new Set<string>(
            (await db.campaignLead.findMany({
              select: { uniqueCode: true },
            })).map(cl => cl.uniqueCode)
          )

          for (const lead of uniqueLeads) {
            let uniqueCode = slugify(lead.companyName || 'lead')
            let codeCandidate = uniqueCode
            let counter = 2
            while (existingCodes.has(codeCandidate)) {
              codeCandidate = `${uniqueCode}-${counter}`
              counter++
            }
            uniqueCode = codeCandidate
            existingCodes.add(uniqueCode)

            const lpLink = `https://${blDomain}/lp/${uniqueCode}`
            const messageBody = populateTemplate(
              campaign.template!.body, lead, campaign.businessLine!, uniqueCode, lpLink
            )

            await db.campaignLead.create({
              data: {
                campaignId: id,
                leadId: lead.id,
                uniqueCode,
                messageBody,
                status: 'pending',
              },
            })
          }

          await db.marketingCampaign.update({
            where: { id },
            data: { totalLeads: uniqueLeads.length },
          })

          // Re-fetch pending leads after generation
          pendingLeads = await db.campaignLead.findMany({
            where: { campaignId: id, status: 'pending' },
            include: { lead: true },
            take: 100,
          })

          console.log(`[Campaign] Auto-generated ${uniqueLeads.length} leads, now sending...`)
        }

        if (pendingLeads.length === 0) {
          return NextResponse.json({ error: 'No pending leads to send. Check segment filters.' }, { status: 400 })
        }
      }

      let sentCount = 0

      if (campaign.channel === 'sms') {
        // Dynamic import to avoid loading SMSO if not needed
        const { sendSMS } = await import('@/lib/integrations/smso')

        for (const cl of pendingLeads) {
          if (!cl.lead.phone) continue
          try {
            await sendSMS(cl.lead.phone, cl.messageBody || '')
            await db.campaignLead.update({
              where: { id: cl.id },
              data: { status: 'sent', sentAt: new Date() },
            })
            // Update lead suppression data
            await db.lead.update({
              where: { id: cl.leadId },
              data: {
                lastCampaignAt: new Date(),
                lastCampaignId: campaign.id,
                campaignCount: { increment: 1 },
              } as any,
            })
            sentCount++
          } catch (err) {
            console.error(`[SMS] Failed to send to ${cl.lead.phone}:`, err)
          }
        }
      } else if (campaign.channel === 'email') {
        // TODO: Implement bulk email via SES
        // For now, mark as sent
        for (const cl of pendingLeads) {
          await db.campaignLead.update({
            where: { id: cl.id },
            data: { status: 'sent', sentAt: new Date() },
          })
          await db.lead.update({
            where: { id: cl.leadId },
            data: {
              lastCampaignAt: new Date(),
              lastCampaignId: campaign.id,
              campaignCount: { increment: 1 },
            } as any,
          })
          sentCount++
        }
      }

      // Update campaign stats
      const totalSent = await db.campaignLead.count({
        where: { campaignId: id, status: { not: 'pending' } },
      })
      const totalPending = await db.campaignLead.count({
        where: { campaignId: id, status: 'pending' },
      })

      // Auto-complete when no more pending leads
      const newStatus = totalPending === 0 && totalSent > 0 ? 'completed' : 'running'

      await db.marketingCampaign.update({
        where: { id },
        data: {
          totalSent,
          status: newStatus,
          sentAt: campaign.sentAt || new Date(),
          completedAt: newStatus === 'completed' ? new Date() : undefined,
        } as any,
      })

      return NextResponse.json({ data: { sent: sentCount, totalSent } })
    }

    return NextResponse.json({ error: 'Invalid action. Use ?action=generate or ?action=send' }, { status: 400 })
  } catch (error) {
    console.error('[API] POST /api/marketing/campaigns/[id] error:', error)
    return NextResponse.json({ error: 'Failed to process campaign action' }, { status: 500 })
  }
}

// ─── Helpers ───

function buildQuickFilter(filter: { field: string; operator: string; value: any }): Record<string, any> | null {
  const { field, operator, value } = filter
  switch (operator) {
    case 'equals':
      return { [field]: { equals: value, mode: 'insensitive' } }
    case 'contains':
      return { [field]: { contains: String(value), mode: 'insensitive' } }
    case 'exists':
      return { [field]: { not: null } }
    case 'not_exists':
      return { [field]: null }
    default:
      return null
  }
}

function populateTemplate(
  template: string,
  lead: any,
  businessLine: any,
  uniqueCode: string,
  lpLink?: string
): string {
  return template
    .replace(/\{\{company_name\}\}/g, lead.companyName || '')
    .replace(/\{\{companyName\}\}/g, lead.companyName || '')
    .replace(/\{\{contact_name\}\}/g, lead.contactPerson || '')
    .replace(/\{\{contactPerson\}\}/g, lead.contactPerson || '')
    .replace(/\{\{city\}\}/g, lead.city || '')
    .replace(/\{\{county\}\}/g, lead.county || '')
    .replace(/\{\{phone\}\}/g, lead.phone || '')
    .replace(/\{\{email\}\}/g, lead.email || '')
    .replace(/\{\{unique_code\}\}/g, uniqueCode)
    .replace(/\{\{bl_name\}\}/g, businessLine.name || '')
    .replace(/\{\{link\}\}/g, lpLink || '')
}

// ─── Slugify company name for unique codes ───
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/s\.?r\.?l\.?|s\.?a\.?/gi, '') // remove SRL, SA
    .replace(/[^a-z0-9]+/g, '-') // non-alnum → dash
    .replace(/-+/g, '-') // collapse dashes
    .replace(/^-|-$/g, '') // trim dashes
    .substring(0, 40) // max 40 chars
    || 'lead'
}
