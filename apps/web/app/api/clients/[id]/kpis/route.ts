import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { getHealthMetrics, getWebVitals, getTrafficBySource } from '@/lib/integrations/posthog'
import { getCallRecordings } from '@/lib/integrations/telnyx'

/**
 * GET /api/clients/[id]/kpis
 * Aggregates KPIs across ALL client projects — used by Client Overview
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom') || new Date(Date.now() - 30*86400000).toISOString().split('T')[0]
    const dateTo = searchParams.get('dateTo') || new Date().toISOString().split('T')[0]

    // 1. Get client with ALL projects (with metadata)
    const client = await db.client.findUnique({
      where: { id },
      include: {
        projects: {
          select: {
            id: true, name: true, status: true, progress: true,
            templateId: true, metadata: true,
          },
          where: { status: { not: 'suspendat' } },
        },
      },
    })

    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    // 2. Collect unique integrations across all projects
    // Group by: posthogId → gscSiteUrl → client website → single fallback
    const domains: Array<{
      domain: string
      domainLabel: string
      posthogId: string | null
      gscSiteUrl: string | null
      telnyxPhones: any[]
      projects: typeof client.projects
    }> = []

    const seenPhones = new Set<string>()

    for (const proj of client.projects) {
      const meta = (proj.metadata || {}) as any
      const posthogId = meta.posthogProjectId || null
      const gscUrl = meta.gscSiteUrl || client.gscSiteUrl || null
      const phones = meta.telnyxPhoneNumbers || []

      // Group by posthogId first, then gscSiteUrl, then single fallback
      let domainKey: string
      let domainLabel: string
      if (posthogId) {
        domainKey = `posthog-${posthogId}`
        domainLabel = gscUrl ? gscUrl.replace('sc-domain:', '').replace('https://', '').replace('/', '') : `PostHog #${posthogId}`
      } else if (gscUrl) {
        domainKey = `gsc-${gscUrl}`
        domainLabel = gscUrl.replace('sc-domain:', '').replace('https://', '').replace('/', '')
      } else {
        domainKey = 'no-integration'
        domainLabel = client.website || client.companyName
      }

      let domain = domains.find(d => d.domain === domainKey)
      if (!domain) {
        domain = {
          domain: domainKey,
          domainLabel,
          posthogId,
          gscSiteUrl: gscUrl,
          telnyxPhones: [],
          projects: [],
        }
        domains.push(domain)
      }
      domain.projects.push(proj)
      // If this project has a posthogId and the domain didn't have one yet, upgrade
      if (posthogId && !domain.posthogId) domain.posthogId = posthogId

      // Collect unique phones
      for (const p of phones) {
        const num = typeof p === 'string' ? p : p.number
        if (num && !seenPhones.has(num)) {
          seenPhones.add(num)
          domain.telnyxPhones.push(p)
        }
      }
    }

    // 3. Fetch KPIs per domain (in parallel)
    const domainResults = await Promise.all(domains.map(async (d) => {
      const result: any = {
        domain: d.domain,
        domainLabel: d.domainLabel,
        posthogId: d.posthogId,
        gscSiteUrl: d.gscSiteUrl,
        hasIntegration: !!(d.posthogId || d.gscSiteUrl || d.telnyxPhones.length > 0),
        projects: d.projects.map(p => ({ id: p.id, name: p.name, status: p.status, template: p.templateId, progress: p.progress })),
        posthog: null,
        telnyx: null,
      }

      // PostHog
      if (d.posthogId && process.env.POSTHOG_PERSONAL_API_KEY) {
        try {
          const [health, vitals, traffic] = await Promise.all([
            getHealthMetrics(d.posthogId, dateFrom, dateTo).catch(() => null),
            getWebVitals(d.posthogId).catch(() => null),
            getTrafficBySource(d.posthogId, dateFrom, dateTo).catch(() => null),
          ])
          result.posthog = { health, webVitals: vitals, traffic }
        } catch (err: any) {
          result.posthog = { error: err.message }
        }
      }

      // Telnyx
      if (d.telnyxPhones.length > 0 && process.env.TELNYX_API_KEY) {
        try {
          result.telnyx = await getCallRecordings(d.telnyxPhones, dateFrom, dateTo)
        } catch (err: any) {
          result.telnyx = { error: err.message }
        }
      }

      return result
    }))

    // 4. Aggregate totals
    let totalCalls = 0
    let totalCallDuration = 0
    let healthScores: number[] = []

    for (const d of domainResults) {
      if (d.telnyx?.totalCalls) totalCalls += d.telnyx.totalCalls
      if (d.telnyx?.totalDuration) totalCallDuration += d.telnyx.totalDuration
      if (d.posthog?.health?.healthScore) healthScores.push(d.posthog.health.healthScore)
    }

    const avgHealth = healthScores.length > 0
      ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
      : null

    return NextResponse.json({
      data: {
        clientId: id,
        clientName: client.companyName,
        dateRange: { from: dateFrom, to: dateTo },
        totalProjects: client.projects.length,
        totalCalls,
        totalCallDuration,
        avgHealthScore: avgHealth,
        domains: domainResults,
      }
    })
  } catch (error: any) {
    console.error('[API] GET /api/clients/[id]/kpis error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch client KPIs' }, { status: 500 })
  }
}
