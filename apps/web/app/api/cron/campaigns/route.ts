import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/cron/campaigns ───
// Cron job endpoint: processes scheduled campaigns that are due
// Call via: crontab, external scheduler, or Vercel cron
// Recommended: every 1-5 minutes
//
// Security: validate CRON_SECRET header to prevent unauthorized calls
export async function GET(request: NextRequest) {
  // Validate cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()

    // Find campaigns that are scheduled and due
    const dueCampaigns = await db.marketingCampaign.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { lte: now },
      },
      include: {
        segment: true,
        template: true,
        businessLine: true,
      },
      take: 5, // Process max 5 per cron tick to avoid timeouts
    })

    if (dueCampaigns.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No campaigns due' })
    }

    const results: { id: string; name: string; sent: number; status: string }[] = []

    for (const campaign of dueCampaigns) {
      try {
        // Mark as running immediately
        await db.marketingCampaign.update({
          where: { id: campaign.id },
          data: { status: 'running' },
        })

        // Get pending leads
        let pendingLeads = await db.campaignLead.findMany({
          where: { campaignId: campaign.id, status: 'pending' },
          include: { lead: true },
        })

        // If no campaign leads exist yet, auto-generate from segment
        if (pendingLeads.length === 0 && campaign.segmentId) {
          // Trigger generate via internal API call
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100'
          const genRes = await fetch(`${baseUrl}/api/marketing/campaigns/${campaign.id}?action=generate`, {
            method: 'POST',
          })

          if (genRes.ok) {
            pendingLeads = await db.campaignLead.findMany({
              where: { campaignId: campaign.id, status: 'pending' },
              include: { lead: true },
            })
          }
        }

        if (pendingLeads.length === 0) {
          await db.marketingCampaign.update({
            where: { id: campaign.id },
            data: { status: 'completed', completedAt: now } as any,
          })
          results.push({ id: campaign.id, name: campaign.name, sent: 0, status: 'completed (no leads)' })
          continue
        }

        // Send messages
        let sentCount = 0

        if (campaign.channel === 'sms') {
          const { sendSMS } = await import('@/lib/integrations/smso')

          for (const cl of pendingLeads) {
            if (!cl.lead.phone) continue
            try {
              await sendSMS(cl.lead.phone, cl.messageBody || '')
              await db.campaignLead.update({
                where: { id: cl.id },
                data: { status: 'sent', sentAt: now },
              })
              await db.lead.update({
                where: { id: cl.leadId },
                data: {
                  lastCampaignAt: now,
                  lastCampaignId: campaign.id,
                  campaignCount: { increment: 1 },
                } as any,
              })
              sentCount++
            } catch (err) {
              console.error(`[Cron/SMS] Failed ${cl.lead.phone}:`, err)
            }
          }
        } else if (campaign.channel === 'email') {
          for (const cl of pendingLeads) {
            await db.campaignLead.update({
              where: { id: cl.id },
              data: { status: 'sent', sentAt: now },
            })
            await db.lead.update({
              where: { id: cl.leadId },
              data: {
                lastCampaignAt: now,
                lastCampaignId: campaign.id,
                campaignCount: { increment: 1 },
              } as any,
            })
            sentCount++
          }
        }

        // Finalize stats
        const totalSent = await db.campaignLead.count({
          where: { campaignId: campaign.id, status: { not: 'pending' } },
        })
        const totalPending = await db.campaignLead.count({
          where: { campaignId: campaign.id, status: 'pending' },
        })

        const finalStatus = totalPending === 0 && totalSent > 0 ? 'completed' : 'running'

        await db.marketingCampaign.update({
          where: { id: campaign.id },
          data: {
            totalSent,
            status: finalStatus,
            sentAt: campaign.sentAt || now,
            completedAt: finalStatus === 'completed' ? now : undefined,
          } as any,
        })

        results.push({ id: campaign.id, name: campaign.name, sent: sentCount, status: finalStatus })
        console.log(`[Cron] Campaign "${campaign.name}": sent ${sentCount}, status=${finalStatus}`)
      } catch (err) {
        console.error(`[Cron] Error processing campaign ${campaign.id}:`, err)
        results.push({ id: campaign.id, name: campaign.name, sent: 0, status: 'error' })
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Campaign cron error:', error)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
