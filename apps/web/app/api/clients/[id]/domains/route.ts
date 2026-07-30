import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

/**
 * GET /api/clients/[id]/domains
 * Returns all domain configurations for a client
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const client = await db.client.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        websites: true,
        website: true,
        googleAdsCustomerId: true,
        gscSiteUrl: true,
        domainConfigs: {
          where: { isActive: true },
          orderBy: { domain: 'asc' },
        },
        projects: {
          where: { status: { not: 'suspendat' } },
          select: { name: true, metadata: true },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client negăsit' }, { status: 404 })
    }

    // Build a list of all known domains from multiple sources
    const domainSet = new Set<string>()

    // 1. From ClientDomainConfig (already configured)
    for (const cfg of client.domainConfigs) {
      domainSet.add(cfg.domain)
    }

    // 2. From client.websites array
    for (const site of client.websites) {
      const domain = extractDomain(site)
      if (domain) domainSet.add(domain)
    }

    // 3. From client.website (main)
    if (client.website) {
      const mainDomain = extractDomain(client.website)
      if (mainDomain) domainSet.add(mainDomain)
    }

    // 4. From client.gscSiteUrl
    if (client.gscSiteUrl) {
      const gscDomain = client.gscSiteUrl.replace('sc-domain:', '').toLowerCase().trim()
      if (gscDomain) domainSet.add(gscDomain)
    }

    // 5. From project metadata (gscSiteUrl, domain, name pattern)
    for (const proj of client.projects) {
      const meta = (proj.metadata || {}) as Record<string, unknown>

      // Extract from metadata.gscSiteUrl
      if (typeof meta.gscSiteUrl === 'string') {
        const d = meta.gscSiteUrl.replace('sc-domain:', '').toLowerCase().trim()
        if (d && d.includes('.')) domainSet.add(d)
      }

      // Extract from metadata.domain
      if (typeof meta.domain === 'string') {
        const d = extractDomain(meta.domain)
        if (d) domainSet.add(d)
      }

      // Extract domain from project name (e.g. "SEO — debitare-plasma.ro")
      const nameMatch = proj.name.match(/[\w-]+\.\w{2,}/i)
      if (nameMatch) {
        const d = nameMatch[0].toLowerCase()
        if (d.includes('.')) domainSet.add(d)
      }
    }

    // Sort: configured domains first, then alphabetically
    const configuredDomains = new Set(client.domainConfigs.map(d => d.domain))
    const allDomains = [...domainSet].sort((a, b) => {
      const aConf = configuredDomains.has(a) ? 0 : 1
      const bConf = configuredDomains.has(b) ? 0 : 1
      if (aConf !== bConf) return aConf - bConf
      return a.localeCompare(b)
    })

    return NextResponse.json({
      data: {
        clientId: client.id,
        clientName: client.companyName,
        // Configured domains with full data sources
        configs: client.domainConfigs,
        // All known domains (including unconfigured ones)
        domains: allDomains,
        // Client-level defaults
        defaults: {
          googleAdsCustomerId: client.googleAdsCustomerId,
          gscSiteUrl: client.gscSiteUrl,
        },
      },
    })
  } catch (error: any) {
    console.error('[API] GET /api/clients/[id]/domains error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/clients/[id]/domains
 * Create or update a domain configuration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { domain, googleAdsCustomerId, googleAdsCampaignIds, gscSiteUrl, posthogProjectId, notes } = body

    if (!domain) {
      return NextResponse.json({ error: 'domain este obligatoriu' }, { status: 400 })
    }

    // Verify client exists
    const client = await db.client.findUnique({ where: { id }, select: { id: true } })
    if (!client) {
      return NextResponse.json({ error: 'Client negăsit' }, { status: 404 })
    }

    // Upsert domain config
    const config = await db.clientDomainConfig.upsert({
      where: { clientId_domain: { clientId: id, domain } },
      create: {
        clientId: id,
        domain,
        googleAdsCustomerId: googleAdsCustomerId || null,
        googleAdsCampaignIds: googleAdsCampaignIds || [],
        gscSiteUrl: gscSiteUrl || null,
        posthogProjectId: posthogProjectId || null,
        notes: notes || null,
      },
      update: {
        googleAdsCustomerId: googleAdsCustomerId !== undefined ? (googleAdsCustomerId || null) : undefined,
        googleAdsCampaignIds: googleAdsCampaignIds !== undefined ? (googleAdsCampaignIds || []) : undefined,
        gscSiteUrl: gscSiteUrl !== undefined ? (gscSiteUrl || null) : undefined,
        posthogProjectId: posthogProjectId !== undefined ? (posthogProjectId || null) : undefined,
        notes: notes !== undefined ? (notes || null) : undefined,
      },
    })

    return NextResponse.json({ data: config }, { status: 201 })
  } catch (error: any) {
    console.error('[API] POST /api/clients/[id]/domains error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ─── Helpers ───

function extractDomain(urlOrDomain: string): string | null {
  try {
    // If it's already a bare domain
    if (!urlOrDomain.includes('://') && !urlOrDomain.startsWith('www.')) {
      return urlOrDomain.toLowerCase().trim()
    }
    // Handle www. prefix
    if (urlOrDomain.startsWith('www.')) {
      return urlOrDomain.slice(4).toLowerCase().trim()
    }
    // Parse as URL
    const url = new URL(urlOrDomain.startsWith('http') ? urlOrDomain : `https://${urlOrDomain}`)
    return url.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return urlOrDomain.toLowerCase().trim()
  }
}
